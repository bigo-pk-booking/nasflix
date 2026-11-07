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
import android.net.Uri;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
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
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 7301;
    private ValueCallback<Uri[]> filePathCallback;
    private WebView webView;
    private FrameLayout root;
    private View nativeSplash;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private long splashStartedAt;
    private boolean initialPageLoaded = false;
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
        splashStartedAt = android.os.SystemClock.elapsedRealtime();
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
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        // Keep the app at the device-width viewport; prevent overview-mode auto shrinking.
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!initialPageLoaded) {
                    initialPageLoaded = true;
                    long remaining = Math.max(0L, 2200L - (android.os.SystemClock.elapsedRealtime() - splashStartedAt));
                    splashHandler.postDelayed(() -> dismissNativeSplash(), remaining);
                }
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
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent chooserIntent = params != null ? params.createIntent() : new Intent(Intent.ACTION_GET_CONTENT);
                    chooserIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    if (params == null) chooserIntent.setType("*/*");
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Unable to open file picker", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
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
        nativeSplash = createNativeSplash();
        root.addView(nativeSplash, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4102);
        }
        // Preserve the WebView's Service Worker Cache Storage so the app shell and
        // downloaded media remain available when the device is offline.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.loadUrl("https://nasflix-dxt.pages.dev/?app=1&appBuild=20261108-musicgridfix2");
        showPreviousCrashIfAny();
    }



    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    private View createNativeSplash() {
        FrameLayout splash = new FrameLayout(this);
        GradientDrawable background = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[]{Color.rgb(38, 18, 62), Color.rgb(18, 12, 31), Color.rgb(7, 6, 13)});
        splash.setBackground(background);

        LinearLayout content = new LinearLayout(this);
        content.setGravity(Gravity.CENTER);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(30), dp(30), dp(30), dp(30));

        TextView logo = new TextView(this);
        logo.setText("N");
        logo.setTextColor(Color.WHITE);
        logo.setTextSize(38);
        logo.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        logo.setGravity(Gravity.CENTER);
        GradientDrawable logoBg = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[]{Color.rgb(168, 85, 247), Color.rgb(192, 38, 211)});
        logoBg.setCornerRadius(dp(22));
        logo.setBackground(logoBg);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(76), dp(76));
        logoParams.bottomMargin = dp(28);
        content.addView(logo, logoParams);

        TextView kicker = new TextView(this);
        kicker.setText("YOUR ENTERTAINMENT UNIVERSE");
        kicker.setTextColor(Color.rgb(196, 169, 255));
        kicker.setTextSize(11);
        kicker.setLetterSpacing(0.20f);
        kicker.setGravity(Gravity.CENTER);
        content.addView(kicker);

        TextView title = new TextView(this);
        title.setText("NASFLIX");
        title.setTextColor(Color.WHITE);
        title.setTextSize( thirtySp() );
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setLetterSpacing(0.16f);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dp(12);
        content.addView(title, titleParams);

        TextView tagline = new TextView(this);
        tagline.setText("Every story starts here.");
        tagline.setTextColor(Color.rgb(169, 160, 187));
        tagline.setTextSize(13);
        tagline.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams taglineParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        taglineParams.topMargin = dp(8);
        taglineParams.bottomMargin = dp(34);
        content.addView(tagline, taglineParams);

        // Circular indeterminate loader with a purple accent.
        ProgressBar progress = new ProgressBar(this);
        progress.setIndeterminate(true);
        progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.rgb(192, 132, 252)));
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(dp(42), dp(42));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        content.addView(progress, progressParams);

        TextView status = new TextView(this);
        status.setText("Starting NASFLIX app…");
        status.setTextColor(Color.rgb(234, 220, 255));
        status.setTextSize(12);
        status.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        statusParams.topMargin = dp(18);
        content.addView(status, statusParams);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        splash.addView(content, contentParams);
        return splash;
    }

    private int dp(float value) {
        return (int)(value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private float thirtySp() { return 30f; }

    private void dismissNativeSplash() {
        if (nativeSplash == null || nativeSplash.getParent() == null) return;
        nativeSplash.animate().alpha(0f).setDuration(300).withEndAction(() -> {
            if (nativeSplash != null && nativeSplash.getParent() == root) root.removeView(nativeSplash);
            nativeSplash = null;
        }).start();
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
        // Commands originate from the visible WebView Activity. Start the service normally;
        // MediaSessionService promotes itself to a media foreground service when playback begins.
        // Calling startForegroundService here creates a strict promotion deadline before Media3
        // has initialized playback, which can crash newer Android/HyperOS devices.
        startService(command);
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
        @JavascriptInterface public String getPlaybackError() { return PlaybackService.getLastPlaybackError(); }
        @JavascriptInterface public String getPlaybackDiagnostics() { return PlaybackService.getPlaybackDiagnostics(); }
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
