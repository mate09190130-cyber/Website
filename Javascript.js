const overlay = document.getElementById("overlay");
const enterButton = document.getElementById("enterButton");

const video = document.getElementById("backgroundVideo");

const viewCounter = document.getElementById("viewCounter");
const viewCount = document.getElementById("viewCount");

const playerControls = document.getElementById("playerControls");
const playPauseButton = document.getElementById("playPauseButton");
const volumeSlider = document.getElementById("volumeSlider");
const timeDisplay = document.getElementById("timeDisplay");

const COUNTER_NAMESPACE = "mateee_xyz_global_views_v2";

const STORAGE_KEY = "mateee_visit_recorded";
const TAB_LOCK_KEY = "mateee_active_tab";

let lastVolume = 0.5;
let videoStarted = false;


function isBot() {
    const ua = navigator.userAgent.toLowerCase();

    const bots = [
        "bot",
        "crawler",
        "spider",
        "facebookexternalhit",
        "discordbot",
        "whatsapp",
        "telegrambot",
        "linkedinbot",
        "slurp"
    ];

    return bots.some(bot => ua.includes(bot));
}


function acquireTabLock() {

    try {

        const current = localStorage.getItem(TAB_LOCK_KEY);

        if (!current) {
            localStorage.setItem(TAB_LOCK_KEY, Date.now());
            return true;
        }

        return false;

    } catch {

        return true;

    }
}


async function initViewCounter() {

    if (isBot()) {

        viewCount.textContent = "-";
        return;

    }

    try {

        const hasSession =
            sessionStorage.getItem(STORAGE_KEY);

        const hasLocal =
            localStorage.getItem(STORAGE_KEY);

        const hasCookie =
            document.cookie.includes("mateee_visited=true");

        const canIncrement =
            !hasSession &&
            !hasLocal &&
            !hasCookie &&
            acquireTabLock();

        let endpoint;

        if (canIncrement) {

            endpoint =
                `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/views/up`;

        } else {

            endpoint =
                `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/views`;

        }

        const response = await fetch(endpoint);

        if (!response.ok)
            throw new Error("Counter API Error");

        const data = await response.json();

        viewCount.textContent =
            Number(data.count).toLocaleString();

        sessionStorage.setItem(
            STORAGE_KEY,
            "true"
        );

        localStorage.setItem(
            STORAGE_KEY,
            "true"
        );

        document.cookie =
            "mateee_visited=true; max-age=31536000; path=/; SameSite=Lax";

        viewCounter.classList.add("visible");

    } catch (error) {

        console.error(error);

        viewCount.textContent = "?";

        viewCounter.classList.add("visible");

    }
}


function formatTime(seconds) {

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;

}


function updateTimeDisplay() {

    if (!video.duration)
        return;

    const current =
        formatTime(video.currentTime);

    const duration =
        formatTime(video.duration);

    timeDisplay.textContent =
        `${current} / ${duration}`;

}


function playVideo() {

    if (!video)
        return;

    video.play()
        .then(() => {

            playPauseButton.textContent = "⏸";

        })
        .catch(() => {

            console.warn("Autoplay blocked");

        });

}


function pauseVideo() {

    video.pause();

    playPauseButton.textContent = "▶";

}


function togglePlayPause() {

    if (video.paused) {

        playVideo();

    } else {

        pauseVideo();

    }

}


async function startMedia() {

    if (videoStarted)
        return;

    videoStarted = true;

    overlay.classList.add("hidden");

    playerControls.classList.add("visible");

    video.muted = false;

    if (window.innerWidth <= 768) {

        video.volume = 1;

    } else {

        video.volume = Number(
            volumeSlider.value
        );

    }

    try {

        await video.play();

        playPauseButton.textContent = "⏸";

    } catch {

        video.muted = true;

        try {

            await video.play();

        } catch {}

    }
}


function updateVolume(value) {

    const vol = Number(value);

    video.volume = vol;

    if (vol > 0)
        lastVolume = vol;

}


function handleKeyboard(event) {

    if (!videoStarted)
        return;

    if (event.code === "Space") {

        event.preventDefault();

        togglePlayPause();

    }

}


function optimizeForMobile() {

    const mobile =
        window.innerWidth <= 768;

    if (mobile) {

        video.setAttribute(
            "playsinline",
            true
        );

        video.setAttribute(
            "webkit-playsinline",
            true
        );

    }

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initViewCounter();

        optimizeForMobile();

    }
);

enterButton.addEventListener(
    "click",
    startMedia
);

playPauseButton.addEventListener(
    "click",
    togglePlayPause
);

volumeSlider.addEventListener(
    "input",
    e => {

        updateVolume(
            e.target.value
        );

    }
);

video.addEventListener(
    "timeupdate",
    updateTimeDisplay
);

video.addEventListener(
    "loadedmetadata",
    updateTimeDisplay
);

video.addEventListener(
    "play",
    () => {

        playPauseButton.textContent = "⏸";

    }
);

video.addEventListener(
    "pause",
    () => {

        playPauseButton.textContent = "▶";

    }
);

document.addEventListener(
    "keydown",
    handleKeyboard
);


document.addEventListener(
    "contextmenu",
    event => event.preventDefault()
);


window.addEventListener(
    "beforeunload",
    () => {

        try {

            localStorage.removeItem(
                TAB_LOCK_KEY
            );

        } catch {}

    }
);