package social.chaplin.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The dev server sits behind a free ngrok tunnel, which shows a
        // "you are about to visit" interstitial instead of the real page
        // to any request whose User-Agent looks like a standard browser -
        // there is no cookie/session bypass, ngrok checks every single
        // request. Verified directly (curl): a Chrome-shaped UA (even with
        // extra text appended) still gets the interstitial; a UA with none
        // of the usual Mozilla/Chrome/Safari tokens does not. Replacing
        // the WebView's UA outright - not appending to it - is what ngrok's
        // own docs call the "non-standard User-Agent" bypass, and it
        // covers every request the WebView makes, not just the first one.
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setUserAgentString("ChaplinApp/1.0 (Android)");
    }
}
