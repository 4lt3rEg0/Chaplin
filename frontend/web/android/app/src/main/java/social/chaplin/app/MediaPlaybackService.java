package social.chaplin.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.MediaMetadataCompat;

// Real Android media notification + MediaSession, driven entirely by intent
// extras from MediaNotificationPlugin.java (the JS<->native bridge). This
// is what makes the current track (a) survive the app being minimized
// instead of just dying with the Activity, and (b) show up as a real
// system "now playing" notification / lock-screen control, which a plain
// WebView <audio> element can never do on its own - that behavior belongs
// to the browser app itself (Chrome), not to WebView-as-a-component, so a
// Capacitor app has to build it explicitly like this.
public class MediaPlaybackService extends Service {
    public static final String ACTION_SHOW = "social.chaplin.app.action.SHOW";
    public static final String ACTION_HIDE = "social.chaplin.app.action.HIDE";
    public static final String ACTION_PLAY = "social.chaplin.app.action.PLAY";
    public static final String ACTION_PAUSE = "social.chaplin.app.action.PAUSE";
    public static final String ACTION_NEXT = "social.chaplin.app.action.NEXT";
    public static final String ACTION_PREVIOUS = "social.chaplin.app.action.PREVIOUS";

    private static final String CHANNEL_ID = "chaplin_playback";
    private static final int NOTIFICATION_ID = 4201;

    private MediaSessionCompat mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManagerCompat.from(this).createNotificationChannel(
            new NotificationChannelCompat.Builder(CHANNEL_ID, NotificationChannelCompat.IMPORTANCE_LOW)
                .setName("Reproductor")
                .setDescription("Controles de reproducción de Chaplin")
                .build()
        );

        mediaSession = new MediaSessionCompat(this, "ChaplinMediaSession");
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                MediaNotificationPlugin.relayAction("play");
            }

            @Override
            public void onPause() {
                MediaNotificationPlugin.relayAction("pause");
            }

            @Override
            public void onSkipToNext() {
                MediaNotificationPlugin.relayAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                MediaNotificationPlugin.relayAction("previous");
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        switch (intent.getAction()) {
            case ACTION_SHOW: {
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                boolean playing = intent.getBooleanExtra("playing", false);
                updateSessionMetadata(title, artist);
                updatePlaybackState(playing);
                startForeground(NOTIFICATION_ID, buildNotification(title, artist, playing));
                break;
            }
            case ACTION_HIDE: {
                if (Build.VERSION.SDK_INT >= 24) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                stopSelf();
                break;
            }
            case ACTION_PLAY:
                MediaNotificationPlugin.relayAction("play");
                break;
            case ACTION_PAUSE:
                MediaNotificationPlugin.relayAction("pause");
                break;
            case ACTION_NEXT:
                MediaNotificationPlugin.relayAction("next");
                break;
            case ACTION_PREVIOUS:
                MediaNotificationPlugin.relayAction("previous");
                break;
            default:
                break;
        }

        return START_NOT_STICKY;
    }

    private void updateSessionMetadata(String title, String artist) {
        if (mediaSession == null) return;
        mediaSession.setMetadata(new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title == null ? "Chaplin" : title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist == null ? "" : artist)
            .build());
    }

    private void updatePlaybackState(boolean playing) {
        if (mediaSession == null) return;
        int state = playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        long actions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
            .build());
    }

    private PendingIntent serviceAction(String action) {
        Intent intent = new Intent(this, MediaPlaybackService.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getService(this, action.hashCode(), intent, flags);
    }

    private Notification buildNotification(String title, String artist, boolean playing) {
        NotificationCompat.Action playPauseAction = playing
            ? new NotificationCompat.Action(android.R.drawable.ic_media_pause, "Pausar", serviceAction(ACTION_PAUSE))
            : new NotificationCompat.Action(android.R.drawable.ic_media_play, "Reproducir", serviceAction(ACTION_PLAY));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title == null ? "Chaplin" : title)
            .setContentText(artist == null ? "" : artist)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_previous, "Anterior", serviceAction(ACTION_PREVIOUS))
            .addAction(playPauseAction)
            .addAction(android.R.drawable.ic_media_next, "Siguiente", serviceAction(ACTION_NEXT))
            .setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));

        return builder.build();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
