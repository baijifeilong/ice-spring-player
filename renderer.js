const {remote} = require("electron");
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Global constants and variables

///// Global constants

const app = remote.app; // Application self
const allMusics = []; // All musics for play
const currentLyricMap = {}; // Current Lyric Map (startedAt=>lyricText)
const userDataRoot = app.getPath("userData"); // Root directory for save user config
const configFilename = `${userDataRoot}/ice-spring-player.config.json`; // The config file to use
const playHistory = []; // The play history
const layouts = ["musics-lyrics-controls", "musics-controls", "lyrics-controls", "lyrics", "controls"];
let currentLayout = "musics-lyrics-controls";
const lyricLayouts = ["column", "column-wrap", "row-wrap", "row"];

///// Global elements

const audioElement = new Audio(); // The HTM5 audio element for play music
const lyricsElement = document.getElementById("lyrics"); // Lyrics view container
const musicsElement = document.getElementById("musics"); // Musics view container
const progressBarElement = document.getElementById("progress-bar"); // Progress bar for player progress
const playPauseElement = document.getElementById("play-pause"); // The button to toggle play and pause
const playNextElement = document.getElementById("play-next"); // The button to play next music
const playPreviousElement = document.getElementById("play-previous"); // The button to play previous music
const stopPlayElement = document.getElementById("stop-play"); // The button to stop current playing
const progressLabelElement = document.getElementById("progress-label"); // The label to show playing progress in seconds
const increaseGlobalFontElement = document.getElementById("increase-global-font"); // The button to increase application font
const decreaseGlobalFontElement = document.getElementById("decrease-global-font"); // THe button to decrease application font
const increaseLyricFontElement = document.getElementById("increase-lyric-font"); // The button to increase lyric font
const decreaseLyricFontElement = document.getElementById("decrease-lyric-font"); // The button to decrease lyric font
const htmlElement = document.querySelector("html"); // The html element to save global font
const bodyElement = document.querySelector("body"); // The body element to process drag and drop for files
const toggleViewElement = document.getElementById("toggle-view"); // The button to toggle application layout
const controlsElement = document.getElementById("controls"); // Controls view container
const settingsElement = document.getElementById("settings"); // Settings view container
const musicsLyricsElement = document.getElementById("musics-lyrics"); // The common parent of musics container and lyrics container
const toggleMusicsElement = document.getElementById("toggle-musics"); // The button to toggle musics visibility
const toggleLyricsElement = document.getElementById("toggle-lyrics"); // The button to toggle lyrics visibility
const toggleControlsElement = document.getElementById("toggle-controls"); // The button to toggle controls visibility
const toggleLyricsFlexDirection = document.getElementById("toggle-lyrics-flex-direction"); // The button to toggle lyrics layout
const toggleMaximizeElement = document.getElementById("toggle-maximize"); // The button to toggle window's maximization
const toggleFullscreenElement = document.getElementById("toggle-fullscreen"); // The button to toggle window's fullscreen
const toggleAlwaysOnTopElement = document.getElementById("toggle-always-on-top"); // The button to toggle window's always-on-top
const doPlayNextElement = document.getElementById("do-play-next"); // The button to toggle window's always-on-top
const quitElement = document.getElementById("quit"); // The button to quit application

///// Global templates

const musicTemplate = musicsElement.firstElementChild; // Music item template
const lyricTemplate = lyricsElement.firstElementChild; // Lyric item template
musicTemplate.remove(); // Remove the music template from DOM tree

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Application's entry

document.addEventListener("DOMContentLoaded", function () {
    loadMusicsFromConfig();
    // loadMusicsFromFilesAndFolders(["/Users/bj/tmp/music"]);
    playPauseElement.click();
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Controls listeners

playPauseElement.onclick = playOrPause;
playNextElement.onclick = playNext;
playPreviousElement.onclick = playPrevious;
stopPlayElement.onclick = stopPlay;
progressBarElement.addEventListener("click", function (e) {
    if (audioElement.paused) return;
    audioElement.currentTime = e.offsetX / this.offsetWidth * audioElement.duration;
});
[...controlsElement.children].filter($ => $ !== progressLabelElement).forEach($ => $.ondblclick = e => e.stopPropagation());

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Application settings listeners

increaseGlobalFontElement.addEventListener("click", function (e) {
    htmlElement.style.fontSize = htmlElement.style.fontSize.replace("em", "") * 1.1 + "em";
});

decreaseGlobalFontElement.addEventListener("click", function () {
    htmlElement.style.fontSize = htmlElement.style.fontSize.replace("em", "") / 1.1 + "em";
});

increaseLyricFontElement.addEventListener("click", function () {
    lyricsElement.style.fontSize = lyricsElement.style.fontSize.replace("em", "") * 1.1 + "em";
});

decreaseLyricFontElement.addEventListener("click", function () {
    lyricsElement.style.fontSize = lyricsElement.style.fontSize.replace("em", "") / 1.1 + "em";
});

toggleViewElement.addEventListener("click", function () {
    currentLayout = layouts[layouts.indexOf(currentLayout) + 1];
    if (!currentLayout) currentLayout = layouts[0];
    console.log(currentLayout);
    musicsElement.style.display = currentLayout.includes("musics") ? "block" : "none";
    lyricsElement.style.display = currentLayout.includes("lyrics") ? "flex" : "none";
    controlsElement.style.display = currentLayout.includes("controls") ? "flex" : "none";
    musicsLyricsElement.style.flexGrow = currentLayout.match(/musics|lyrics/) ? "1e9" : "0";
});


toggleMusicsElement.addEventListener("click", function () {
    musicsElement.style.display = musicsElement.style.display === "none" ? "flex" : "none";
});

toggleLyricsElement.addEventListener("click", function () {
    lyricsElement.style.display = lyricsElement.style.display === "none" ? "flex" : "none";
});

toggleControlsElement.addEventListener("click", function () {
    controlsElement.style.display = controlsElement.style.display === "none" ? "flex" : "none";
});

toggleLyricsFlexDirection.addEventListener("click", function () {
    let lastLayout = lyricsElement.getAttribute("data-layout");
    if (!lastLayout) lastLayout = "column";
    let nextLayout = lyricLayouts[lyricLayouts.indexOf(lastLayout) + 1];
    if (!nextLayout) nextLayout = "column";
    lyricsElement.setAttribute("data-layout", nextLayout);

    lyricsElement.style.flexDirection = nextLayout.includes("column") ? "column" : "row";
    lyricsElement.style.flexWrap = nextLayout.includes("wrap") ? "wrap" : "nowrap";
});

toggleMaximizeElement.addEventListener("click", function () {
    const window = remote.getCurrentWindow();
    window.isMaximized() ? window.unmaximize() : window.maximize();
    this.firstElementChild.setAttribute("data-icon", window.isMaximized() ? "compress-arrows-alt" : "expand-arrows-alt");
});

toggleFullscreenElement.addEventListener("click", function () {
    const window = remote.getCurrentWindow();
    window.setFullScreen(!window.isFullScreen());
    this.firstElementChild.setAttribute("data-icon", window.isFullScreen() ? "compress" : "expand");
});

toggleAlwaysOnTopElement.addEventListener("click", function () {
    const window = remote.getCurrentWindow();
    window.setAlwaysOnTop(!window.isAlwaysOnTop());
    this.firstElementChild.setAttribute("data-icon", window.isAlwaysOnTop() ? "unlock" : "lock");
});

doPlayNextElement.addEventListener("click", function () {
    playNext();
})

controlsElement.addEventListener("dblclick", function () {
    const window = remote.getCurrentWindow();
    window.setFullScreen(!window.isFullScreen());
});

quitElement.addEventListener("click", function () {
    app.exit();
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Global listeners

bodyElement.addEventListener("mousedown", function () {
    bodyElement.setAttribute("data-is-dragging", "false");
});

bodyElement.addEventListener("mousemove", function () {
    bodyElement.setAttribute("data-is-dragging", "true");
});

window.addEventListener("resize", function () {
    settingsElement.style.flexDirection = window.innerHeight >= 350 ? "column" : "row-reverse";
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Drag and drop listeners

document.ondragover = ev => ev.preventDefault();
document.ondrop = (ev) => {
    const filesAndFolders = [...ev.dataTransfer.items]
        .map($ => $.getAsFile())
        .filter($ => $ !== null)
        .map($ => $.path);
    const loadedMusics = loadMusicsFromFilesAndFolders(filesAndFolders);
    if (!loadedMusics) {
        console.log("No new musics:", loadedMusics);
        return;
    }
    saveMusicsToConfig(allMusics);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Player listeners

/**
 * Listen for playing and update play-pause icon
 */
audioElement.addEventListener("playing", function () {
    playPauseElement.firstElementChild.setAttribute("data-icon", "pause");
});

/**
 * Listen for pause and stop, then update icon, lyrics and progress label
 */
audioElement.addEventListener("pause", function () {
    console.log(audioElement.currentTime);
    playPauseElement.firstElementChild.setAttribute("data-icon", "play");
    if (audioElement.getAttribute("data-stopped") === "true") {
        console.log("STOPPED");
        audioElement.src = "";
        [...musicsElement.children].forEach($ => $.classList.remove("active"));
        progressLabelElement.textContent = "0:00/0:00";
        [...lyricsElement.children].forEach($ => $.remove());
        lyricsElement.appendChild(lyricTemplate.cloneNode(true));
    }
});

/**
 * Listen for playing ended then play next music
 */
audioElement.addEventListener("ended", function () {
    playNext();
});

/**
 * Listen for time update and refresh lyric show
 */
audioElement.addEventListener("timeupdate", function () {
    if (isNaN(this.duration)) return;
    progressBarElement.value = this.currentTime / this.duration * 100;

    const positionMillis = Number.parseInt(this.currentTime * 1000);

    const lyricPosition = calculateLyricPosition(currentLyricMap, positionMillis);
    [...lyricsElement.children].forEach($ => {
        $.classList.remove("active");
    });
    const lyricIndex = Object.keys(currentLyricMap).indexOf(lyricPosition);
    const lyricElement = [...lyricsElement.children][lyricIndex];
    lyricElement.classList.add("active");
    lyricElement.scrollIntoView({});

    const positionSeconds = Number.parseInt(this.currentTime);
    const durationSeconds = Number.parseInt(this.duration);
    let progressText = `${~~(positionSeconds / 60)}:${positionSeconds % 60}`;
    progressText += `/${~~(durationSeconds / 60)}:${durationSeconds % 60}`;
    progressText = progressText.replace(/(\d+):(\d)(?!\d)/g, "$1:0$2");
    progressLabelElement.textContent = progressText;
});

/**
 * Listener for music metadata loaded and load lyric file
 */
audioElement.addEventListener("loadedmetadata", function () {
    const musicFilename = audioElement.realSrc;
    const musicElement = [...musicsElement.children].filter($ => $.getAttribute("data-filename") === musicFilename)[0];

    [...musicsElement.children].forEach($ => $.classList.remove("active"));
    musicElement.classList.add("active");
    // musicElement.scrollIntoView({behavior: "smooth"});
    musicElement.scrollIntoView({});

    const lyricFilename = musicFilename.replace(".mp3", ".lrc");
    let lyricText;
    if (!fs.existsSync(lyricFilename)) {
        lyricText = `[00:00.00]歌词文件不存在\n[99:00.00]${lyricFilename}`;
    } else {
        try {
            const buffer = fs.readFileSync(lyricFilename);
            lyricText = iconv.decode(buffer, "gbk");
        } catch (e) {
            lyricText = `[00:00.00]歌词文件解码错误\n[99:00.00]${e}`;
        }
    }
    const lyricRegex = /^((\[\d+:\d+\.\d+])+)([^[\]]+)$/;
    Object.keys(currentLyricMap).forEach($ => delete currentLyricMap[$]);
    lyricText.split("\n").forEach(line => {
        const matcher = lyricRegex.exec(line);
        if (!matcher) return;
        const timePart = matcher[1];
        const contentPart = matcher[3].trim();
        if (contentPart === "") return;
        const timeSpans = timePart.split(/[\[\]]+/).filter($ => $);
        timeSpans.forEach(span => {
            const parts = span.split(/[:.]/).map($ => Number.parseInt($));
            const millis = parts[0] * 60000 + parts[1] * 1000 + parts[2];
            currentLyricMap[millis] = contentPart;
        })
    });
    // lyricsElement.children[0].scrollIntoView({});
    [...lyricsElement.children].forEach($ => $.remove());
    Object.entries(currentLyricMap).forEach(([k, v]) => {
        const lyricElement = lyricTemplate.cloneNode(true);
        lyricElement.textContent = v;
        lyricsElement.appendChild(lyricElement);
        lyricElement.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            if (bodyElement.getAttribute("data-is-dragging") === "false") {
                audioElement.currentTime = k / 1000;
            }
        });
        lyricElement.addEventListener("dblclick", function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
        }, false)
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Player functions

/**
 * Play next music
 */
function playNext() {
    const currentMusicFilename = audioElement.realSrc;
    const musicsExceptCurrent = allMusics.filter($ => $["filename"] !== currentMusicFilename);
    if (musicsExceptCurrent.length === 0) return;
    const nextMusicFilename = musicsExceptCurrent[~~(musicsExceptCurrent.length * Math.random())]["filename"];
    playMusic(nextMusicFilename);
}

/**
 * Play previous music
 */
function playPrevious() {
    playHistory.pop();
    const previousMusicFilename = playHistory.pop();
    if (previousMusicFilename) playMusic(previousMusicFilename); else playNext();
}

/**
 * Play the music file
 *
 * @param filename The music filename
 */
function playMusic(filename) {
    audioElement.src = filename;
    audioElement.play().finally();
    audioElement.setAttribute("data-stopped", "false");
    if (!([...playHistory].pop() === filename)) playHistory.push(filename);
}

/**
 * Play or pause
 */
function playOrPause() {
    if (allMusics.length === 0) return;
    if (!audioElement.src || !audioElement.src.endsWith(".mp3")) {
        playNext();
        return;
    }
    if (audioElement.paused) audioElement.play().finally(); else audioElement.pause();
}

/**
 * Stop music playing
 */
function stopPlay() {
    if (audioElement.currentTime > 0) {
        audioElement.play();
    }
    audioElement.currentTime = 0;
    audioElement.pause();
    audioElement.setAttribute("data-stopped", "true");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Common functions

/**
 * Load musics from application's config file
 */
function loadMusicsFromConfig() {
    if (!fs.existsSync(configFilename)) return;
    const configText = fs.readFileSync(configFilename).toString();
    const configJson = JSON.parse(configText);
    console.log("Current config: ", configJson);
    const musics = configJson["musics"];
    if (!musics) {
        console.log("There are not any music of config file:", musics);
        return;
    }
    loadMusics(musics);
}

/**
 * Save musics to application's config file
 *
 * @param musics Musics
 */
function saveMusicsToConfig(musics) {
    console.log("Saving config:", {musics});
    fs.writeFileSync(configFilename, JSON.stringify({musics}));
}

/**
 * Load musics from files and folders
 *
 * @param filesAndFolders
 * @returns {{song: string, filename: *, artist: string}[]}
 */
function loadMusicsFromFilesAndFolders(filesAndFolders) {
    let newMusicFilenames = [];
    for (const item of filesAndFolders) {
        if (fs.lstatSync(item).isDirectory()) {
            const filenames = fs.readdirSync(item).map($ => `${item}/${$}`);
            newMusicFilenames.push(...filenames);
        } else {
            newMusicFilenames.push(item);
        }
    }
    const oldMusicFilenames = allMusics.map($ => $["filename"]);
    newMusicFilenames = newMusicFilenames
        .filter($ => $.endsWith(".mp3"))
        .filter($ => !oldMusicFilenames.includes($));
    const newMusics = newMusicFilenames.map((filename) => {
        const baseFilename = path.basename(filename);
        const matcher = /(.+)-(.+)\.mp3/.exec(baseFilename);
        const artist = matcher ? matcher[1].trim() : "Unknown";
        const song = matcher ? matcher[2].trim() : baseFilename.replace(".mp3", "").trim();
        return {artist, song, filename};
    });
    if (newMusics.length === 0) return;
    loadMusics(newMusics);
    return newMusics;
}

/**
 * Load musics to playlist
 *
 * @param newMusics
 */
function loadMusics(newMusics) {
    [...Array(0)].forEach(() => newMusics.push(...newMusics));
    console.log("Loading musics: ", newMusics);
    allMusics.push(...newMusics);
    console.log("All musics:", [...allMusics]);
    allMusics.sort(((a, b) => `${a["artist"]}-${a["song"]}`.localeCompare(`${b["artist"]}-${b["song"]}`)));
    console.log("Sorted musics:", [...allMusics]);

    const allMusicElements = [...musicsElement.children].concat(newMusics.map(() => musicTemplate.cloneNode(true)));
    allMusicElements.forEach((musicElement, index) => {
        const {artist, song, filename} = allMusics[index];
        musicElement.classList.remove("active");
        filename === audioElement.realSrc && musicElement.classList.add("active");
        musicElement.setAttribute("data-filename", filename);
        const children = [...musicElement.children];
        children[0].textContent = index + 1;
        children[1].textContent = artist;
        children[2].textContent = song;
        const removeElement = children[3];
        ["mouseenter", "mouseleave"].forEach($ => removeElement.addEventListener($, function (e) {
            e.type.includes("enter") ? this.classList.add("active") : this.classList.remove("active");
        }));
        removeElement.addEventListener("click", function (e) {
            e.stopPropagation();
            const filename = this.parentElement.getAttribute("data-filename");
            const currentMusicFilename = audioElement.realSrc;
            if (filename === currentMusicFilename) {
                if (allMusics.length > 1) playNext(); else stopPlay();
            }
            removeMusic(filename);
        });
        musicElement.addEventListener("click", function () {
            if (bodyElement.getAttribute("data-is-dragging") === "false") playMusic(filename);
        });
    });

    musicsElement.textContent = "";
    musicsElement.append(...allMusicElements);
}

/**
 * Remove music from playlist
 *
 * @param filename
 */
function removeMusic(filename) {
    allMusics.splice(allMusics.findIndex($ => $["filename"] === filename), 1);
    [...musicsElement.children].filter($ => $.getAttribute("data-filename") === filename).pop().remove();
    [...musicsElement.children].forEach((el, index) => {
        el.querySelector(".number").textContent = (index + 1).toString();
    });
    saveMusicsToConfig(allMusics);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// Common utilities

function calculateLyricPosition(lyricMap, position) {
    const beginPosition = Object.keys(lyricMap)[0];
    const endPosition = Object.keys(lyricMap).reverse()[0];
    if (position < beginPosition) {
        return beginPosition;
    }
    let lastPosition = beginPosition;
    for (const key of Object.keys(lyricMap)) {
        if (key > position) {
            return lastPosition;
        }
        lastPosition = key;
    }
    return endPosition;
}

Object.defineProperty(Audio.prototype, "realSrc", {
    get: function () {
        let realSrc = decodeURIComponent(this.src).replace("file://", "");
        if ((process.platform === "win32") && realSrc) realSrc = realSrc.substring(1).replace(/\//g, "\\")
        return realSrc.endsWith(".html") ? "" : realSrc;
    }
});
