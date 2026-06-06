/* ======================================================
   mateee.xyz - Javascript.js
====================================================== */

"use strict";

/* ======================================================
   ELEMENTS
====================================================== */

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

/* ======================================================
   STATE
====================================================== */

let videoStarted = false;
let lastVolume = 0.5;

/* ======================================================
   SVG ICON PATHS
====================================================== */

const svgPlay = `
    <path d="M8 5v14l11-7z"/>
`;

const svgPause = `
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
`;

const svgVolHigh = `
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
`;

const svgVolLow = `
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
`;

const svgVolMute = `
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
`;

/* ======================================================
   HELPERS
====================================================== */

function setIcon(svgElement, path) {
    if (!svgElement || typeof path !== "string") return;
    svgElement.innerHTML = path;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function getSafeVolumeValue(value, fallback = 0.5) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.min(1, Math.max(0, number));
}

function updateTimeDisplay() {
    if (!video || !timeDisplay) return;

    const current = formatTime(video.currentTime);
    const duration = formatTime(video.duration);

    timeDisplay.textContent = `${current} / ${duration}`;
}

function updatePlayPauseButtonState() {
    if (!video || !playPauseButton || !playPauseIcon) return;

    if (video.paused) {
        setIcon(playPauseIcon, svgPlay);
        playPauseButton.setAttribute("aria-label", "Play video");
        playPauseButton.setAttribute("title", "Play");
        return;
    }

    setIcon(playPauseIcon, svgPause);
    playPauseButton.setAttribute("aria-label", "Pause video");
    playPauseButton.setAttribute("title", "Pause");
}

function updateVolumeIcon() {
    if (!video || !volumeIcon || !muteButton) return;

    if (video.muted || video.volume === 0) {
        setIcon(volumeIcon, svgVolMute);
        muteButton.setAttribute("aria-label", "Unmute video");
        muteButton.setAttribute("title", "Unmute");
        return;
    }

    muteButton.setAttribute("aria-label", "Mute video");
    muteButton.setAttribute("title", "Mute");

    if (video.volume < 0.5) {
        setIcon(volumeIcon, svgVolLow);
        return;
    }

    setIcon(volumeIcon, svgVolHigh);
}

function syncVolumeSlider() {
    if (!video || !volumeSlider) return;

    volumeSlider.value = video.muted ? "0" : String(video.volume);
}

/* ======================================================
   VIDEO PLAYBACK
====================================================== */

async function playVideo() {
    if (!video) return;

    try {
        await video.play();
    } catch {
        try {
            video.muted = true;
            await video.play();
        } catch {
            videoStarted = false;

            if (overlay) {
                overlay.classList.remove("hidden");
            }

            if (playerControls) {
                playerControls.classList.remove("visible");
            }
        }
    } finally {
        updatePlayPauseButtonState();
        updateVolumeIcon();
        syncVolumeSlider();
        updateTimeDisplay();
    }
}

function pauseVideo() {
    if (!video) return;

    video.pause();
    updatePlayPauseButtonState();
}

function togglePlayPause() {
    if (!video) return;

    if (!videoStarted) {
        startMedia();
        return;
    }

    if (video.paused) {
        playVideo();
    } else {
        pauseVideo();
    }
}

/* ======================================================
   START MEDIA
====================================================== */

async function startMedia() {
    if (videoStarted) return;

    videoStarted = true;

    if (overlay) {
        overlay.classList.add("hidden");
    }

    if (playerControls) {
        playerControls.classList.add("visible");
    }

    if (!video) return;

    video.currentTime = 0;

    const isMobile =
        window.matchMedia("(max-width: 768px)").matches ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const sliderValue = volumeSlider ? getSafeVolumeValue(volumeSlider.value) : 0.5;

    if (isMobile) {
        video.volume = 1;
        video.muted = false;
        lastVolume = 1;
    } else {
        video.volume = sliderValue;
        video.muted = sliderValue === 0;

        if (sliderValue > 0) {
            lastVolume = sliderValue;
        }
    }

    syncVolumeSlider();
    await playVideo();
}

/* ======================================================
   VOLUME
====================================================== */

function updateVolume(value) {
    if (!video) return;

    const vol = getSafeVolumeValue(value);

    video.volume = vol;
    video.muted = vol === 0;

    if (vol > 0) {
        lastVolume = vol;
    }

    updateVolumeIcon();
    syncVolumeSlider();
}

function toggleMute() {
    if (!video) return;

    if (video.muted || video.volume === 0) {
        const restoreVolume = getSafeVolumeValue(lastVolume || 0.5);

        video.muted = false;
        video.volume = restoreVolume;
    } else {
        lastVolume = video.volume || 0.5;
        video.muted = true;
    }

    updateVolumeIcon();
    syncVolumeSlider();
}

/* ======================================================
   KEYBOARD CONTROLS
====================================================== */

function handleKeyboard(event) {
    if (!videoStarted) return;

    const activeElement = document.activeElement;
    const isRangeFocused = activeElement && activeElement.matches && activeElement.matches('input[type="range"]');

    if (event.code === "Space" && !isRangeFocused) {
        event.preventDefault();
        togglePlayPause();
    }

    if (event.key && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
    }
}

/* ======================================================
   MOBILE / VIEWPORT FIX
====================================================== */

function setViewportHeightVariable() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}

function optimizeVideoForDevice() {
    if (!video) return;

    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("preload", "metadata");
}

/* ======================================================
   BLOCK SELECTION / DRAGGING
====================================================== */

function blockSelectionAndDragging() {
    document.addEventListener("selectstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("dragstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("mousedown", function (event) {
        const allowedInteractive = event.target.closest("a, button, input, .volume-slider");

        if (!allowedInteractive) {
            event.preventDefault();
        }
    });

    document.addEventListener("touchstart", function () {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }, { passive: true });

    document.addEventListener("touchend", function () {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }, { passive: true });
}

/* ======================================================
   EVENTS
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setViewportHeightVariable();
    optimizeVideoForDevice();
    blockSelectionAndDragging();

    if (volumeSlider && video) {
        video.volume = getSafeVolumeValue(volumeSlider.value);
        video.muted = true;
        lastVolume = getSafeVolumeValue(volumeSlider.value);
    }

    updatePlayPauseButtonState();
    updateVolumeIcon();
    syncVolumeSlider();
    updateTimeDisplay();
});

if (enterButton) {
    enterButton.addEventListener("click", startMedia);
}

if (playPauseButton) {
    playPauseButton.addEventListener("click", togglePlayPause);
}

if (muteButton) {
    muteButton.addEventListener("click", toggleMute);
}

if (volumeSlider) {
    volumeSlider.addEventListener("input", event => {
        updateVolume(event.target.value);
    });
}

if (video) {
    video.addEventListener("loadedmetadata", updateTimeDisplay);
    video.addEventListener("durationchange", updateTimeDisplay);
    video.addEventListener("timeupdate", updateTimeDisplay);

    video.addEventListener("play", updatePlayPauseButtonState);
    video.addEventListener("pause", updatePlayPauseButtonState);

    video.addEventListener("volumechange", () => {
        updateVolumeIcon();
        syncVolumeSlider();
    });
}

document.addEventListener("keydown", handleKeyboard);

window.addEventListener("resize", setViewportHeightVariable);

window.addEventListener("orientationchange", () => {
    window.setTimeout(setViewportHeightVariable, 250);
});

/* ======================================================
   CONTEXT MENU DISABLE
====================================================== */

document.addEventListener("contextmenu", event => {
    event.preventDefault();
});
