/* ======================================================
   mateee.xyz - script.js
   GitHub Pages compatible
====================================================== */

/* ======================================================
   ELEMENTS
====================================================== */

const overlay = document.getElementById("overlay");
const enterButton = document.getElementById("enterButton");

const video = document.getElementById("backgroundVideo");

const viewCounter = document.getElementById("viewCounter");
const viewCount = document.getElementById("viewCount");

const playerControls = document.getElementById("playerControls");
const playPauseButton = document.getElementById("playPauseButton");
const playPauseIcon = document.getElementById("playPauseIcon");

const muteButton = document.getElementById("muteButton");
const volumeIcon = document.getElementById("volumeIcon");
const volumeSlider = document.getElementById("volumeSlider");

const timeDisplay = document.getElementById("timeDisplay");

/* ======================================================
   CONFIG
====================================================== */

const COUNTER_NAMESPACE = "mateee_xyz_global_counter";
const COUNTER_KEY = "views";

const STORAGE_VIEW_KEY = "mateee_view_counted_v3";
const STORAGE_LAST_COUNT_KEY = "mateee_last_view_count_v3";
const STORAGE_LOCK_KEY = "mateee_view_lock_v3";

const COOKIE_VIEW_KEY = "mateee_view_counted";

const LOCK_TIMEOUT = 3000;

let videoStarted = false;
let lastVolume = 0.5;

/* ======================================================
   SVG ICONS
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
    if (!svgElement) return;
    svgElement.innerHTML = path;
}

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "...";
    }

    return number.toLocaleString("en-US");
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function showViewCounter() {
    if (!viewCounter) return;
    viewCounter.classList.add("visible");
}

function getCookie(name) {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split("=");

        if (key === name) {
            return value;
        }
    }

    return null;
}

function setCookie(name, value, maxAgeSeconds) {
    const secure = location.protocol === "https:" ? "; Secure" : "";

    document.cookie =
        `${name}=${value}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax${secure}`;
}

function safeLocalGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

function safeLocalRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch {}
}

function safeSessionGet(key) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSessionSet(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch {}
}

/* ======================================================
   BOT FILTER
====================================================== */

function isLikelyBot() {
    const ua = navigator.userAgent.toLowerCase();

    const botKeywords = [
        "bot",
        "crawler",
        "spider",
        "slurp",
        "facebookexternalhit",
        "discordbot",
        "telegrambot",
        "whatsapp",
        "linkedinbot",
        "preview",
        "embed",
        "curl",
        "wget",
        "python",
        "node-fetch"
    ];

    return botKeywords.some(keyword => ua.includes(keyword));
}

/* ======================================================
   VIEW COUNTER LOCK
====================================================== */

function acquireViewLock() {
    const now = Date.now();

    const currentLock = safeLocalGet(STORAGE_LOCK_KEY);

    if (currentLock) {
        const lockTime = Number(currentLock);

        if (Number.isFinite(lockTime) && now - lockTime < LOCK_TIMEOUT) {
            return false;
        }
    }

    safeLocalSet(STORAGE_LOCK_KEY, String(now));
    return true;
}

function releaseViewLock() {
    safeLocalRemove(STORAGE_LOCK_KEY);
}

/* ======================================================
   COUNTER API
====================================================== */

async function fetchCounter(endpoint) {
    const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        mode: "cors"
    });

    if (!response.ok) {
        throw new Error(`Counter API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data.count === "undefined") {
        throw new Error("Counter API response missing count");
    }

    return Number(data.count);
}

async function getCounterValue() {
    const endpoint =
        `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;

    return fetchCounter(endpoint);
}

async function incrementCounterValue() {
    const endpoint =
        `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up`;

    return fetchCounter(endpoint);
}

/* ======================================================
   VIEW COUNTER INIT
====================================================== */

async function initViewCounter() {
    if (!viewCount || !viewCounter) return;

    showViewCounter();

    const cachedCount = safeLocalGet(STORAGE_LAST_COUNT_KEY);

    if (cachedCount) {
        viewCount.textContent = formatNumber(cachedCount);
    } else {
        viewCount.textContent = "...";
    }

    if (isLikelyBot()) {
        try {
            const count = await getCounterValue();

            viewCount.textContent = formatNumber(count);
            safeLocalSet(STORAGE_LAST_COUNT_KEY, String(count));
        } catch {
            viewCount.textContent = cachedCount ? formatNumber(cachedCount) : "0";
        }

        return;
    }

    const hasSession = safeSessionGet(STORAGE_VIEW_KEY) === "true";
    const hasLocal = safeLocalGet(STORAGE_VIEW_KEY) === "true";
    const hasCookie = getCookie(COOKIE_VIEW_KEY) === "true";

    const shouldIncrement =
        !hasSession &&
        !hasLocal &&
        !hasCookie;

    if (!shouldIncrement) {
        try {
            const count = await getCounterValue();

            viewCount.textContent = formatNumber(count);
            safeLocalSet(STORAGE_LAST_COUNT_KEY, String(count));
        } catch {
            viewCount.textContent = cachedCount ? formatNumber(cachedCount) : "0";
        }

        return;
    }

    const locked = acquireViewLock();

    if (!locked) {
        setTimeout(initViewCounter, LOCK_TIMEOUT + 250);
        return;
    }

    try {
        const count = await incrementCounterValue();

        viewCount.textContent = formatNumber(count);

        safeSessionSet(STORAGE_VIEW_KEY, "true");
        safeLocalSet(STORAGE_VIEW_KEY, "true");
        safeLocalSet(STORAGE_LAST_COUNT_KEY, String(count));

        setCookie(COOKIE_VIEW_KEY, "true", 60 * 60 * 24 * 365);
    } catch {
        try {
            const count = await getCounterValue();

            viewCount.textContent = formatNumber(count);
            safeLocalSet(STORAGE_LAST_COUNT_KEY, String(count));
        } catch {
            viewCount.textContent = cachedCount ? formatNumber(cachedCount) : "0";
        }
    } finally {
        releaseViewLock();
    }
}

/* ======================================================
   CROSS-TAB SYNC
====================================================== */

window.addEventListener("storage", event => {
    if (event.key === STORAGE_LAST_COUNT_KEY && event.newValue && viewCount) {
        viewCount.textContent = formatNumber(event.newValue);
    }
});

/* ======================================================
   VIDEO TIME
====================================================== */

function updateTimeDisplay() {
    if (!video || !timeDisplay) return;

    const current = formatTime(video.currentTime);
    const duration = formatTime(video.duration);

    timeDisplay.textContent = `${current} / ${duration}`;
}

/* ======================================================
   VIDEO PLAYBACK
====================================================== */

async function playVideo() {
    if (!video) return;

    try {
        await video.play();
        setIcon(playPauseIcon, svgPause);
    } catch {
        try {
            video.muted = true;
            await video.play();
            setIcon(playPauseIcon, svgPause);
            updateVolumeIcon();
        } catch {}
    }
}

function pauseVideo() {
    if (!video) return;

    video.pause();
    setIcon(playPauseIcon, svgPlay);
}

function togglePlayPause() {
    if (!video) return;

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

    if (isMobile) {
        video.volume = 1;
        video.muted = false;
    } else {
        const sliderValue = volumeSlider ? Number(volumeSlider.value) : 0.5;
        video.volume = Number.isFinite(sliderValue) ? sliderValue : 0.5;
        video.muted = false;
    }

    await playVideo();
    updateVolumeIcon();
}

/* ======================================================
   VOLUME
====================================================== */

function updateVolume(value) {
    if (!video) return;

    const vol = Math.min(1, Math.max(0, Number(value)));

    video.volume = vol;
    video.muted = vol === 0;

    if (vol > 0) {
        lastVolume = vol;
    }

    updateVolumeIcon();
}

function toggleMute() {
    if (!video) return;

    if (video.muted || video.volume === 0) {
        const restoreVolume = lastVolume || 0.5;

        video.muted = false;
        video.volume = restoreVolume;

        if (volumeSlider) {
            volumeSlider.value = restoreVolume;
        }
    } else {
        lastVolume = video.volume || 0.5;

        video.muted = true;

        if (volumeSlider) {
            volumeSlider.value = 0;
        }
    }

    updateVolumeIcon();
}

function updateVolumeIcon() {
    if (!video || !volumeIcon) return;

    if (video.muted || video.volume === 0) {
        setIcon(volumeIcon, svgVolMute);
        return;
    }

    if (video.volume < 0.5) {
        setIcon(volumeIcon, svgVolLow);
        return;
    }

    setIcon(volumeIcon, svgVolHigh);
}

/* ======================================================
   KEYBOARD CONTROLS
====================================================== */

function handleKeyboard(event) {
    if (!videoStarted) return;

    if (event.code === "Space") {
        event.preventDefault();
        togglePlayPause();
    }

    if (event.key.toLowerCase() === "m") {
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
   EVENTS
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
    setViewportHeightVariable();
    optimizeVideoForDevice();

    initViewCounter();

    setIcon(playPauseIcon, svgPause);
    setIcon(volumeIcon, svgVolHigh);

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
    video.addEventListener("timeupdate", updateTimeDisplay);

    video.addEventListener("play", () => {
        setIcon(playPauseIcon, svgPause);
    });

    video.addEventListener("pause", () => {
        setIcon(playPauseIcon, svgPlay);
    });

    video.addEventListener("volumechange", updateVolumeIcon);
}

document.addEventListener("keydown", handleKeyboard);

window.addEventListener("resize", setViewportHeightVariable);
window.addEventListener("orientationchange", () => {
    setTimeout(setViewportHeightVariable, 250);
});

/* ======================================================
   CONTEXT MENU DISABLE
====================================================== */

document.addEventListener("contextmenu", event => {
    event.preventDefault();
});