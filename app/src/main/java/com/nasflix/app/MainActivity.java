package com.nasflix.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.widget.Toast;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import android.app.PendingIntent;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.graphics.drawable.Icon;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.os.Bundle;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private WebView webView;
    private FrameLayout root;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private int normalUiVisibility;
    private volatile boolean directVideoPlaying = false;
    private static volatile MainActivity activeInstance;
    public static final String ACTION_PIP_PAUSE = "com.nasflix.app.PIP_PAUSE";
    public static final String ACTION_PIP_PLAY = "com.nasflix.app.PIP_PLAY";
    public static final String ACTION_PIP_CLOSE = "com.nasflix.app.PIP_CLOSE";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installCrashLogger();
        activeInstance = this;
        getWindow().setStatusBarColor(android.graphics.Color.rgb(9,8,17));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(9,8,17));
        root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(9,8,17));
        WebSettings settings = webView.getSettings();
        webView.addJavascriptInterface(new NasflixBridge(), "NasflixAndroid");
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                String js = "(function(){"
                    + "var injected=document.getElementById('nasflixAppMenuButton');if(injected)injected.remove();"
                    + "var toggle=document.getElementById('menuToggle'),nav=document.getElementById('mainNav');"
                    + "if(toggle){toggle.style.setProperty('display','inline-flex','important');toggle.style.setProperty('visibility','visible','important');toggle.style.setProperty('opacity','1','important');}"
                    + "if(nav){nav.classList.remove('open');}"
                    + "})();";
                view.evaluateJavascript(js, null);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                showCustomView(view, callback);
            }
            @Override public void onShowCustomView(View view, int requestedOrientation, CustomViewCallback callback) {
                showCustomView(view, callback);
            }
            @Override public void onHideCustomView() { hideCustomView(); }
        });
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4102);
        }
        webView.clearCache(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.loadUrl("https://nasflix-dxt.pages.dev/?app=1&appBuild=20261107-nativeaudio4");
        showPreviousCrashIfAny();
    }



    private void installCrashLogger() {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            try (PrintWriter writer = new PrintWriter(new FileWriter(new File(getFilesDir(), "nasflix-crash.txt")))) {
                writer.println("NASFLIX crash diagnostic");
                writer.println("Android SDK: " + Build.VERSION.SDK_INT);
                writer.println("Device: " + Build.MANUFACTURER + " " + Build.MODEL);
                writer.println("Thread: " + thread.getName());
                error.printStackTrace(writer);
            } catch (Exception ignored) { }
            if (previous != null) previous.uncaughtException(thread, error);
        });
    }

    private void showPreviousCrashIfAny() {
        File report = new File(getFilesDir(), "nasflix-crash.txt");
        if (!report.exists()) return;
        try {
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(report));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line).append("\n");
            reader.close();
            String details = body.toString();
            new AlertDialog.Builder(this)
                .setTitle("NASFLIX crash report")
                .setMessage("May na-detect na error noong nakaraang pagbukas. Pindutin ang COPY REPORT at ipadala rito ang nakopyang text.\n\n" + details)
                .setPositiveButton("COPY REPORT", (dialog, which) -> {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    clipboard.setPrimaryClip(ClipData.newPlainText("NASFLIX crash report", details));
                    Toast.makeText(this, "Crash report copied. I-paste dito sa chat.", Toast.LENGTH_LONG).show();
                })
                .setNegativeButton("CLOSE", (dialog, which) -> { })
                .show();
            report.delete();
        } catch (Exception ignored) { }
    }

    private void sendPlaybackCommand(String action, Intent extras) {
        Intent command = new Intent(this, PlaybackService.class);
        command.setAction(action);
        if (extras != null) command.putExtras(extras);
        boolean needsForeground = PlaybackService.ACTION_PLAY.equals(action) ||
            (PlaybackService.ACTION_SET_QUEUE.equals(action) && extras != null && extras.getBooleanExtra(PlaybackService.EXTRA_AUTOPLAY, true));
        if (Build.VERSION.SDK_INT >= 26 && needsForeground) startForegroundService(command);
        else startService(command);
    }

    private class NasflixBridge {
        @JavascriptInterface public void setVideoPlaying(boolean isPlaying) { directVideoPlaying = isPlaying; runOnUiThread(() -> updatePictureInPictureParams()); }
        @JavascriptInterface public void playQueue(String queueJson, int index, boolean autoplay) {
            Intent extras = new Intent();
            extras.putExtra(PlaybackService.EXTRA_QUEUE, queueJson);
            extras.putExtra(PlaybackService.EXTRA_INDEX, index);
            extras.putExtra(PlaybackService.EXTRA_AUTOPLAY, autoplay);
            sendPlaybackCommand(PlaybackService.ACTION_SET_QUEUE, extras);
        }
        @JavascriptInterface public void play() { sendPlaybackCommand(PlaybackService.ACTION_PLAY, null); }
        @JavascriptInterface public void pause() { sendPlaybackCommand(PlaybackService.ACTION_PAUSE, null); }
        @JavascriptInterface public void stop() { sendPlaybackCommand(PlaybackService.ACTION_STOP, null); }
        @JavascriptInterface public void seekTo(long positionMs) {
            Intent extras = new Intent(); extras.putExtra(PlaybackService.EXTRA_POSITION, positionMs);
            sendPlaybackCommand(PlaybackService.ACTION_SEEK, extras);
        }
        @JavascriptInterface public void setVolume(float volume) {
            Intent extras = new Intent(); extras.putExtra(PlaybackService.EXTRA_VOLUME, volume);
            sendPlaybackCommand(PlaybackService.ACTION_VOLUME, extras);
        }
        @JavascriptInterface public long getCurrentPosition() { return PlaybackService.getCurrentPositionMs(); }
        @JavascriptInterface public long getDuration() { return PlaybackService.getDurationMs(); }
        @JavascriptInterface public boolean isPlaying() { return PlaybackService.isPlayingNow(); }
    }

    private void showCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        if (customView != null) { callback.onCustomViewHidden(); return; }
        customView = view;
        customViewCallback = callback;
        normalUiVisibility = getWindow().getDecorView().getSystemUiVisibility();
        webView.setVisibility(View.GONE);
        root.addView(view, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void hideCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(normalUiVisibility);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (customViewCallback != null) customViewCallback.onCustomViewHidden();
        customViewCallback = null;
    }

    private RemoteAction pipAction(String title, int iconRes, String action, int requestCode) {
        Intent intent = new Intent(this, PipActionReceiver.class).setAction(action);
        PendingIntent pending = PendingIntent.getBroadcast(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new RemoteAction(Icon.createWithResource(this, iconRes), title, title, pending);
    }

    private void handlePipAction(String action) {
        if (webView == null) return;
        if (ACTION_PIP_CLOSE.equals(action)) {
            webView.evaluateJavascript("(function(){var v=document.querySelector('#playerScreen video');if(v)v.pause();})();", null);
            directVideoPlaying = false;
            finish();
        } else if (ACTION_PIP_PAUSE.equals(action)) {
            webView.evaluateJavascript("(function(){var v=document.querySelector('#playerScreen video');if(v)v.pause();})();", null);
        } else if (ACTION_PIP_PLAY.equals(action)) {
            webView.evaluateJavascript("(function(){var v=document.querySelector('#playerScreen video');if(v)v.play().catch(function(){});})();", null);
        }
    }

    public static class PipActionReceiver extends BroadcastReceiver {
        @Override public void onReceive(Context context, Intent intent) {
            MainActivity activity = activeInstance;
            if (activity != null && intent != null) activity.runOnUiThread(() -> activity.handlePipAction(intent.getAction()));
        }
    }

    @Override protected void onDestroy() {
        if (activeInstance == this) activeInstance = null;
        super.onDestroy();
    }

    private PictureInPictureParams buildPipParams() {
        ArrayList<RemoteAction> actions = new ArrayList<>();
        actions.add(pipAction("Play", android.R.drawable.ic_media_play, ACTION_PIP_PLAY, 1));
        actions.add(pipAction("Pause", android.R.drawable.ic_media_pause, ACTION_PIP_PAUSE, 2));
        actions.add(pipAction("Close", android.R.drawable.ic_menu_close_clear_cancel, ACTION_PIP_CLOSE, 3));
        PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
            .setAspectRatio(new Rational(16, 9)).setActions(actions);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) builder.setAutoEnterEnabled(directVideoPlaying);
        return builder.build();
    }

    private void updatePictureInPictureParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isFinishing()) {
            try { setPictureInPictureParams(buildPipParams()); }
            catch (IllegalStateException error) { android.util.Log.w("NASFLIX", "Unable to update PiP parameters", error); }
        }
    }

    @Override public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && directVideoPlaying && customView == null) {
            try { enterPictureInPictureMode(buildPipParams()); }
            catch (IllegalStateException error) { android.util.Log.w("NASFLIX", "Unable to enter picture-in-picture", error); }
        }
    }
    @Override public void onBackPressed() {
        if (customView != null) { hideCustomView(); return; }
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
