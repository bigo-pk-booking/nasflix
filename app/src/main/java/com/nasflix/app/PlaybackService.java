package com.nasflix.app;

import android.content.Intent;
import android.app.PendingIntent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.common.util.UnstableApi;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@UnstableApi
public class PlaybackService extends MediaSessionService {
    public static final String ACTION_SET_QUEUE = "com.nasflix.app.action.SET_QUEUE";
    public static final String ACTION_PLAY = "com.nasflix.app.action.PLAY";
    public static final String ACTION_PAUSE = "com.nasflix.app.action.PAUSE";
    public static final String ACTION_STOP = "com.nasflix.app.action.STOP";
    public static final String ACTION_SEEK = "com.nasflix.app.action.SEEK";
    public static final String ACTION_VOLUME = "com.nasflix.app.action.VOLUME";
    public static final String EXTRA_QUEUE = "queue_json";
    public static final String EXTRA_INDEX = "queue_index";
    public static final String EXTRA_AUTOPLAY = "autoplay";
    public static final String EXTRA_POSITION = "position_ms";
    public static final String EXTRA_VOLUME = "volume";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable progressUpdater = new Runnable() {
        @Override public void run() {
            updatePlaybackState();
            handler.postDelayed(this, 500);
        }
    };

    private static volatile long currentPositionMs = 0;
    private static volatile long durationMs = 0;
    private static volatile boolean playing = false;
    private static volatile String lastPlaybackError = "";
    public static String getLastPlaybackError() { return lastPlaybackError; }
    public static volatile String playbackDiagnostics = "Player not initialized";
    public static String getPlaybackDiagnostics() { return playbackDiagnostics; }

    public static long getCurrentPositionMs() { return currentPositionMs; }
    public static long getDurationMs() { return durationMs; }
    public static boolean isPlayingNow() { return playing; }

    @Override public void onCreate() {
        super.onCreate();
        setMediaNotificationProvider(new DefaultMediaNotificationProvider.Builder(this)
            .setChannelId("nasflix_media_playback")
            .setChannelName(R.string.nasflix_media_channel)
            .setNotificationId(5201)
            .build());
        player = new ExoPlayer.Builder(this).build();
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build();
        player.setAudioAttributes(audioAttributes, true);
        // Keep the CPU awake during active playback so audio can continue with the screen off.
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.setHandleAudioBecomingNoisy(true);
        player.setRepeatMode(Player.REPEAT_MODE_ALL);
        player.addListener(new Player.Listener() {
            @Override public void onIsPlayingChanged(boolean isPlaying) {
                updatePlaybackState();
            }

            @Override public void onPlaybackStateChanged(int playbackState) {
                updatePlaybackState();
            }

            @Override public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                lastPlaybackError = "";
                updatePlaybackState();
            }

            @Override public void onPlayerError(androidx.media3.common.PlaybackException error) {
                lastPlaybackError = androidx.media3.common.PlaybackException.getErrorCodeName(error.errorCode) + ": " + String.valueOf(error.getMessage());
                android.util.Log.e("NASFLIX", "Media playback error: " + lastPlaybackError, error);
                updatePlaybackState();
            }
        });
        Intent activityIntent = new Intent(this, MainActivity.class);
        PendingIntent sessionActivity = PendingIntent.getActivity(this, 0, activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        mediaSession = new MediaSession.Builder(this, player)
            .setSessionActivity(sessionActivity)
            .build();
        updatePlaybackState();
        handler.post(progressUpdater);
    }

    private void updatePlaybackState() {
        if (player == null) {
            currentPositionMs = 0;
            durationMs = 0;
            playing = false;
            return;
        }
        currentPositionMs = Math.max(0, player.getCurrentPosition());
        playbackDiagnostics = "state=" + player.getPlaybackState() + ", items=" + player.getMediaItemCount() + ", playWhenReady=" + player.getPlayWhenReady() + ", isPlaying=" + player.isPlaying() + ", url=" + (player.getCurrentMediaItem() == null || player.getCurrentMediaItem().localConfiguration == null ? "none" : String.valueOf(player.getCurrentMediaItem().localConfiguration.uri));
        long currentDuration = player.getDuration();
        durationMs = currentDuration == C.TIME_UNSET ? 0 : Math.max(0, currentDuration);
        playing = player.isPlaying();
    }

    @Nullable
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        // Let MediaSessionService process its lifecycle exactly once.
        int sessionResult = super.onStartCommand(intent, flags, startId);
        if (intent == null) return sessionResult;

        String action = intent.getAction();
        try {
            if (ACTION_SET_QUEUE.equals(action)) {
                setQueue(intent.getStringExtra(EXTRA_QUEUE),
                    intent.getIntExtra(EXTRA_INDEX, 0),
                    intent.getBooleanExtra(EXTRA_AUTOPLAY, true));
            } else if (ACTION_PLAY.equals(action)) {
                if (player != null && player.getMediaItemCount() > 0) player.play();
            } else if (ACTION_PAUSE.equals(action)) {
                if (player != null) player.pause();
            } else if (ACTION_STOP.equals(action)) {
                if (player != null) {
                    player.stop();
                    player.clearMediaItems();
                }
                currentPositionMs = 0;
                durationMs = 0;
                playing = false;
                stopForeground(true);
                stopSelf();
            } else if (ACTION_SEEK.equals(action)) {
                if (player != null && player.getMediaItemCount() > 0) {
                    player.seekTo(Math.max(0, intent.getLongExtra(EXTRA_POSITION, 0)));
                }
            } else if (ACTION_VOLUME.equals(action)) {
                if (player != null) {
                    float volume = intent.getFloatExtra(EXTRA_VOLUME, 0.85f);
                    player.setVolume(Math.max(0f, Math.min(1f, volume)));
                }
            }
        } catch (RuntimeException error) {
            android.util.Log.e("NASFLIX", "Playback command failed: " + action, error);
        }
        return sessionResult;
    }

    private void setQueue(String json, int requestedIndex, boolean autoplay) {
        if (player == null || json == null) return;
        try {
            JSONArray array = new JSONArray(json);
            List<MediaItem> mediaItems = new ArrayList<>();
            for (int i = 0; i < array.length(); i++) {
                JSONObject track = array.getJSONObject(i);
                String url = track.optString("url", "");
                if (url.isEmpty()) continue;
                MediaMetadata.Builder metadata = new MediaMetadata.Builder()
                    .setTitle(track.optString("title", "NASFLIX"))
                    .setArtist(track.optString("artist", "NASFLIX"))
                    .setAlbumArtist("NASFLIX")
                    .setDisplayTitle(track.optString("title", "NASFLIX"))
                    .setAlbumTitle("NASFLIX");
                String artwork = track.optString("artwork", "");
                if (!artwork.isEmpty()) {
                    try { metadata.setArtworkUri(Uri.parse(artwork)); } catch (Exception ignored) {}
                }
                metadata.setIsBrowsable(false).setIsPlayable(true);
                mediaItems.add(new MediaItem.Builder()
                    .setUri(Uri.parse(url))
                    .setMediaMetadata(metadata.build())
                    .build());
            }
            if (mediaItems.isEmpty()) { lastPlaybackError = "Queue is empty: no valid audio URL"; playbackDiagnostics = lastPlaybackError; return; }
            int index = Math.max(0, Math.min(requestedIndex, mediaItems.size() - 1));
            lastPlaybackError = "";
            playbackDiagnostics = "Queue received: " + mediaItems.size() + " tracks; URL=" + mediaItems.get(index).localConfiguration.uri;
            player.setMediaItems(mediaItems, index, 0);
            player.prepare();
            player.setPlayWhenReady(autoplay);
            if (!autoplay) player.pause();
        } catch (Exception error) {
            lastPlaybackError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
            playbackDiagnostics = lastPlaybackError;
            android.util.Log.e("NASFLIX", "Unable to start native media queue", error);
        }
    }

    @Override public void onTaskRemoved(@Nullable Intent rootIntent) {
        if (player == null || !player.isPlaying()) stopSelf();
        // Keep the foreground media service alive while audio is playing.
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(progressUpdater);
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        currentPositionMs = 0;
        durationMs = 0;
        playing = false;
        super.onDestroy();
    }
}
