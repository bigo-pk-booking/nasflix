package com.nasflix.app;

import android.app.Activity;
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
                    + "var top=document.querySelector('.topbar'),group=document.querySelector('.brand-group'),brand=document.querySelector('.brand'),nav=document.querySelector('.main-nav');"
                    + "if(!top)return;"
                    + "if(nav)nav.style.setProperty('display','none','important');"
                    + "if(document.getElementById('nasflixAppMenuButton'))return;"
                    + "var host=group||top;host.style.setProperty('display','flex','important');host.style.setProperty('align-items','center','important');"
                    + "var b=document.createElement('button');b.id='nasflixAppMenuButton';b.type='button';b.textContent='☰';b.setAttribute('aria-label','Open menu');"
                    + "b.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;flex:0 0 42px;width:42px;height:42px;min-width:42px;align-items:center;justify-content:center;margin-right:10px;border:1px solid #40364f;border-radius:12px;background:#171421;color:#f2eaff;font-size:24px;position:relative;z-index:2147483001;';"
                    + "if(brand&&brand.parentNode===host)host.insertBefore(b,brand);else host.insertBefore(b,host.firstChild);"
                    + "var overlay=document.createElement('div');overlay.id='nasflixAppMenu';overlay.style.cssText='display:none;position:fixed;inset:0;z-index:2147483000;background:#000b;padding:76px 14px 16px;';"
                    + "var panel=document.createElement('div');panel.style.cssText='width:min(320px,88vw);max-height:calc(100vh - 100px);overflow:auto;background:#151220;border:1px solid #ffffff30;border-radius:17px;padding:14px;box-shadow:0 20px 60px #000;';"
                    + "var names=[['Home','#home'],['Movies','#movies'],['AI Videos','#videos'],['Series','#series'],['Music','#music'],['For you','#movies'],['Animation','#movies'],['Anime','#movies'],['Action','#movies'],['Comedy','#movies'],['Horror','#movies'],['Romance','#movies'],['Fantasy','#movies'],['Sci-Fi','#movies']];"
                    + "names.forEach(function(n){var a=document.createElement('a');a.href=n[1];a.textContent=n[0];a.style.cssText='display:flex;align-items:center;min-height:44px;padding:0 13px;margin:2px 0;border-radius:9px;color:#f1eaff;text-decoration:none;font:14px sans-serif;';a.addEventListener('click',function(){overlay.style.display='none';});panel.appendChild(a);});"
                    + "overlay.appendChild(panel);document.body.appendChild(overlay);"
                    + "b.addEventListener('click',function(){overlay.style.display=overlay.style.display==='block'?'none':'block';});"
                    + "overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.style.display='none';});"
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
        webView.clearCache(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.loadUrl("https://nasflix-dxt.pages.dev/?app=1&appBuild=20261107-menu3");
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
