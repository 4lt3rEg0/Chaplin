package social.chaplin.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

// JS <-> native bridge for MediaPlaybackService. PlayerContext.jsx calls
// show()/hide() on every play/pause/track change; the service's notification
// buttons and MediaSession transport controls call back in the other
// direction through relayAction(), which fires the "action" event
// PlayerContext.jsx listens for. See MediaPlaybackService.java for why this
// needs a real Service instead of just the Web Media Session API - a
// WebView has no OS-level "now playing" surface of its own.
@CapacitorPlugin(name = "MediaNotification")
public class MediaNotificationPlugin extends Plugin {
    private static WeakReference<MediaNotificationPlugin> activeInstance;

    @Override
    protected void handleOnStart() {
        activeInstance = new WeakReference<>(this);
    }

    static void relayAction(String action) {
        MediaNotificationPlugin instance = activeInstance == null ? null : activeInstance.get();
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        instance.notifyListeners("action", data);
    }

    @PluginMethod
    public void show(PluginCall call) {
        // Fire-and-forget: Android 13+ requires this permission at runtime
        // to actually display the notification, but there is nothing
        // useful to block on here - if it's not granted yet this just
        // triggers the system prompt, and startForegroundService()/notify()
        // below silently no-op instead of crashing either way. The next
        // show() call after the user grants it works normally.
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4201);
        }
        startPlaybackService(call);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_HIDE);
        getContext().startService(intent);
        call.resolve();
    }

    private void startPlaybackService(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_SHOW);
        intent.putExtra("title", call.getString("title", "Chaplin"));
        intent.putExtra("artist", call.getString("artist", ""));
        intent.putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", false)));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }
}
