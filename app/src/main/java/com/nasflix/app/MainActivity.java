package com.nasflix.app;

import android.app.Activity;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private FrameLayout root;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private int normalUiVisibility;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
        webView.loadUrl("https://nasflix-dxt.pages.dev/?app=1&appBuild=20261107-nativeaudio3");
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

    @Override public void onBackPressed() {
        if (customView != null) { hideCustomView(); return; }
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
