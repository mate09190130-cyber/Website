"use strict";

console.info("[mateee] Javascript.js v4 loaded");

const overlay = document.getElementById("overlay");
const enterButton = document.getElementById("enterButton");
const video = document.getElementById("backgroundVideo");
const playerControls = document.getElementById("playerControls");
const playPauseButton = document.getElementById("playPauseButton");
const playPauseIcon = document.getElementById("playPauseIcon");
const muteButton = document.getElementById("muteButton");
const volumeIcon = document.getElementById("volumeIcon");
const volumeSlider = document.getElementById("volumeSlider");
const timeDisplay = document.getElementById("timeDisplay");

const svgPlay = `<path d="M8 5v14l11-7z"/>`;
const svgPause = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
const svgVolHigh = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
const svgVolLow = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`;
const svgVolMute = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;

const state = {
    started: false,
    starting: false,
    userPaused: false,
    recovering: false,
    sourceIndex: 0,
    sources: [],
    lastVolume: 0.5,
    lastTime: 0,
    lastAdvanceAt: Date.now(),
    stallStartedAt: 0,
    lastRecoveryAt: 0,
    recoveryAttempts: 0
};

function setIcon(element, svg) {
    if (element) element.innerHTML = svg;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function updateTimeDisplay() {
    if (!video || !timeDisplay) return;

    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
}

function updatePlayPauseButton() {
    if (!video || !playPauseButton || !playPauseIcon) return;

    if (video.paused) {
        setIcon(playPauseIcon, svgPlay);
        playPauseButton.setAttribute("aria-label", "Play video");
        playPauseButton.setAttribute("title", "Play");
    } else {
        setIcon(playPauseIcon, svgPause);
        playPauseButton.setAttribute("aria-label", "Pause video");
        playPauseButton.setAttribute("title", "Pause");
    }
}

function updateVolumeIcon() {
    if (!video || !volumeIcon || !muteButton) return;

    if (video.muted || video.volume === 0) {
        setIcon(volumeIcon, svgVolMute);
        muteButton.setAttribute("aria-label", "Unmute video");
        muteButton.setAttribute("title", "Unmute");
    } else if (video.volume < 0.5) {
        setIcon(volumeIcon, svgVolLow);
        muteButton.setAttribute("aria-label", "Mute video");
        muteButton.setAttribute("title", "Mute");
    } else {
        setIcon(volumeIcon, svgVolHigh);
        muteButton.setAttribute("aria-label", "Mute video");
        muteButton.setAttribute("title", "Mute");
    }
}

function syncVolumeSlider() {
    if (!video || !volumeSlider) return;
    volumeSlider.value = video.muted ? "0" : String(video.volume);
}

function getSafeVolume(value, fallback = 0.5) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(1, Math.max(0, number));
}

function getConnection() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function shouldUse1080p() {
    const width = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const connection = getConnection();

    if (connection && connection.saveData) return false;
    if (connection && /^(slow-2g|2g|3g)$/i.test(connection.effectiveType || "")) return false;

    return width >= 769;
}

function buildSourceList() {
    const high = "Video-1080.mp4";
    const low = "Video.mp4";

    if (shouldUse1080p()) {
        return [high, low];
    }

    return [low, high];
}

function setVideoSource(src, keepTime = false, cacheBust = false) {
    if (!video || !src) return;

    const currentTime = keepTime && Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const finalSrc = cacheBust ? `${src}?v=${Date.now()}` : src;

    if (video.currentSrc.includes(src) && !cacheBust) return;

    console.info(`[mateee] loading video source: ${src}`);

    video.pause();
    video.src = finalSrc;
    video.preload = state.started ? "auto" : "metadata";
    video.load();

    if (currentTime > 0) {
        video.addEventListener("loadedmetadata", function seekAfterLoad() {
            video.removeEventListener("loadedmetadata", seekAfterLoad);

            try {
                video.currentTime = Math.min(currentTime + 0.2, Math.max(0, video.duration - 0.5));
            } catch (error) {
                console.warn("[mateee] seek failed", error);
            }
        });
    }
}

function prepareVideo() {
    if (!video) return;

    state.sources = buildSourceList();
    state.sourceIndex = 0;

    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.disablePictureInPicture = true;
    video.controls = false;
    video.preload = "metadata";

    setVideoSource(state.sources[0], false, false);
}

async function playVideo(showOverlayOnFail = true) {
    if (!video) return;

    try {
        state.userPaused = false;
        await video.play();
    } catch (error) {
        console.warn("[mateee] normal play failed, trying muted play", error);

        try {
            video.muted = true;
            await video.play();
        } catch (mutedError) {
            console.warn("[mateee] muted play failed", mutedError);

            if (showOverlayOnFail) {
                state.started = false;
                overlay?.classList.remove("hidden");
                playerControls?.classList.remove("visible");
            }
        }
    } finally {
        updatePlayPauseButton();
        updateVolumeIcon();
        syncVolumeSlider();
        updateTimeDisplay();
    }
}

function pauseVideo(userAction = true) {
    if (!video) return;

    if (userAction) state.userPaused = true;

    video.pause();
    updatePlayPauseButton();
}

async function startMedia() {
    if (!video || state.started || state.starting) return;

    state.started = true;
    state.starting = true;
    state.userPaused = false;

    overlay?.classList.add("hidden");
    playerControls?.classList.add("visible");

    video.preload = "auto";
    state.sources = buildSourceList();
    state.sourceIndex = 0;

    setVideoSource(state.sources[0], false, false);

    const initialVolume = volumeSlider ? getSafeVolume(volumeSlider.value) : 0.5;
    video.volume = initialVolume;
    video.muted = initialVolume === 0;

    if (initialVolume > 0) state.lastVolume = initialVolume;

    try {
        video.currentTime = 0;
    } catch {}

    state.lastTime = 0;
    state.lastAdvanceAt = Date.now();
    state.stallStartedAt = 0;

    await playVideo(true);

    state.starting = false;
}

function togglePlayPause() {
    if (!video) return;

    if (!state.started) {
        startMedia();
        return;
    }

    if (video.paused) {
        playVideo(true);
    } else {
        pauseVideo(true);
    }
}

function updateVolume(value) {
    if (!video) return;

    const volume = getSafeVolume(value);

    video.volume = volume;
    video.muted = volume === 0;

    if (volume > 0) state.lastVolume = volume;

    updateVolumeIcon();
    syncVolumeSlider();
}

function toggleMute() {
    if (!video) return;

    if (video.muted || video.volume === 0) {
        video.muted = false;
        video.volume = getSafeVolume(state.lastVolume || 0.5);
    } else {
        state.lastVolume = video.volume || 0.5;
        video.muted = true;
    }

    updateVolumeIcon();
    syncVolumeSlider();
}

async function switchToFallback(reason) {
    if (!video || state.sourceIndex >= state.sources.length - 1) return false;

    state.sourceIndex += 1;

    const nextSource = state.sources[state.sourceIndex];

    console.warn(`[mateee] switching video source after ${reason}: ${nextSource}`);

    setVideoSource(nextSource, true, false);

    if (state.started && !state.userPaused && navigator.onLine) {
        await playVideo(false);
    }

    return true;
}

async function recoverVideo(reason) {
    if (!video || state.recovering || !state.started || state.userPaused) return;
    if (document.hidden || !navigator.onLine) return;

    const now = Date.now();

    if (now - state.lastRecoveryAt < 2500) return;

    state.recovering = true;
    state.lastRecoveryAt = now;
    state.recoveryAttempts += 1;

    console.warn(`[mateee] recovering video after ${reason}, attempt ${state.recoveryAttempts}`);

    try {
        if (state.recoveryAttempts <= 2) {
            try {
                video.currentTime = Math.min(video.currentTime + 0.25, Math.max(0, video.duration - 0.5));
            } catch {}

            await playVideo(false);
        } else if (!(await switchToFallback(reason))) {
            setVideoSource(state.sources[state.sourceIndex], true, true);
            await playVideo(false);
        }
    } finally {
        state.recovering = false;
        state.stallStartedAt = 0;
        state.lastAdvanceAt = Date.now();
    }
}

function startWatchdog() {
    window.setInterval(() => {
        if (!video || !state.started || state.userPaused || state.recovering) return;
        if (video.paused || video.ended || video.seeking || document.hidden) return;

        const now = Date.now();
        const current = video.currentTime;
        const moved = Math.abs(current - state.lastTime) > 0.04;

        if (moved) {
            state.lastTime = current;
            state.lastAdvanceAt = now;
            state.stallStartedAt = 0;
            state.recoveryAttempts = 0;
            return;
        }

        if (!state.stallStartedAt) {
            state.stallStartedAt = now;
        }

        const stalledFor = now - Math.max(state.stallStartedAt, state.lastAdvanceAt);
        const needsData = video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;

        if (stalledFor >= 4500 || (needsData && stalledFor >= 2500)) {
            recoverVideo(needsData ? "buffer starvation" : "watchdog stall");
        }
    }, 1500);
}

function setViewportHeightVariable() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}

function blockSelectionAndDragging() {
    document.querySelectorAll("a, button, input").forEach(element => {
        element.setAttribute("tabindex", "-1");
        element.addEventListener("focus", () => element.blur());
    });

    document.addEventListener("selectstart", event => event.preventDefault());
    document.addEventListener("dragstart", event => event.preventDefault());

    document.addEventListener("mousedown", event => {
        const allowed = event.target.closest("a, button, input, .volume-slider");

        if (!allowed) {
            event.preventDefault();
        }
    });

    document.addEventListener("touchstart", () => {
        window.getSelection?.().removeAllRanges();
    }, { passive: true });

    document.addEventListener("touchend", () => {
        window.getSelection?.().removeAllRanges();
    }, { passive: true });
}

function handleKeyboard(event) {
    if (event.code === "Tab" || event.code === "Space") {
        event.preventDefault();
        document.activeElement?.blur?.();
        return;
    }

    if (!state.started) return;

    if (event.key && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setViewportHeightVariable();
    blockSelectionAndDragging();
    prepareVideo();
    startWatchdog();

    if (video && volumeSlider) {
        const initialVolume = getSafeVolume(volumeSlider.value);

        video.volume = initialVolume;
        video.muted = initialVolume === 0;
        state.lastVolume = initialVolume > 0 ? initialVolume : 0.5;
    }

    updatePlayPauseButton();
    updateVolumeIcon();
    syncVolumeSlider();
    updateTimeDisplay();
});

overlay?.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    startMedia();
});

enterButton?.addEventListener("click", event => {
    event.preventDefault();
    startMedia();
});

playPauseButton?.addEventListener("click", togglePlayPause);
muteButton?.addEventListener("click", toggleMute);

volumeSlider?.addEventListener("input", event => {
    updateVolume(event.target.value);
});

if (video) {
    video.addEventListener("loadedmetadata", updateTimeDisplay);
    video.addEventListener("durationchange", updateTimeDisplay);

    video.addEventListener("timeupdate", () => {
        state.lastTime = video.currentTime;
        state.lastAdvanceAt = Date.now();
        state.stallStartedAt = 0;
        state.recoveryAttempts = 0;
        updateTimeDisplay();
    });

    video.addEventListener("progress", () => {
        state.lastAdvanceAt = Date.now();
    });

    video.addEventListener("canplay", () => {
        state.stallStartedAt = 0;
    });

    video.addEventListener("waiting", () => {
        console.warn("[mateee] video waiting");
        if (state.started && !state.userPaused) {
            state.stallStartedAt = state.stallStartedAt || Date.now();
        }
    });

    video.addEventListener("stalled", () => {
        console.warn("[mateee] video stalled");
        if (state.started && !state.userPaused) {
            recoverVideo("stalled");
        }
    });

    video.addEventListener("error", async () => {
        const code = video.error ? video.error.code : "unknown";

        console.warn(`[mateee] video error: ${code}`);

        if (!(await switchToFallback(`error ${code}`))) {
            recoverVideo(`error ${code}`);
        }
    });

    video.addEventListener("ended", () => {
        if (!state.started || state.userPaused) return;

        try {
            video.currentTime = 0;
        } catch {}

        playVideo(false);
    });

    video.addEventListener("play", updatePlayPauseButton);
    video.addEventListener("pause", updatePlayPauseButton);

    video.addEventListener("volumechange", () => {
        updateVolumeIcon();
        syncVolumeSlider();
    });
}

document.addEventListener("keydown", handleKeyboard);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.started && !state.userPaused) {
        playVideo(false);
    }
});

window.addEventListener("online", () => {
    if (state.started && !state.userPaused) {
        playVideo(false);
    }
});

window.addEventListener("offline", () => {
    console.warn("[mateee] browser offline");
});

window.addEventListener("resize", () => {
    setViewportHeightVariable();

    if (!state.started) {
        prepareVideo();
    }
});

window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
        setViewportHeightVariable();

        if (!state.started) {
            prepareVideo();
        }
    }, 250);
});

document.addEventListener("contextmenu", event => {
    event.preventDefault();
});