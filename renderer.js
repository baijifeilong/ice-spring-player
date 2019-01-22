const {remote} = require("electron");
const app = remote.app;
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const audioElement = new Audio();

const lyricsElement = document.getElementById("lyrics");
const lyricTemplate = lyricsElement.firstElementChild;

const musicsElement = document.getElementById("musics");
const musicTemplate = musicsElement.firstElementChild;
musicTemplate.remove();

const progressBarElement = document.getElementById("progress-bar");
const playPauseElement = document.getElementById("play-pause");
const playNextElement = document.getElementById("play-next");
const playPreviousElement = document.getElementById("play-previous");
const stopPlayElement = document.getElementById("stop-play");
const progressLabelElement = document.getElementById("progress-label");
const increaseGlobalFontElement = document.getElementById("increase-global-font");
const decreaseGlobalFontElement = document.getElementById("decrease-global-font");
const increaseLyricFontElement = document.getElementById("increase-lyric-font");
const decreaseLyricFontElement = document.getElementById("decrease-lyric-font");
const htmlElement = document.querySelector("html");
const bodyElement = document.querySelector("body");
const toggleViewElement = document.getElementById("toggle-view");
const controlsElement = document.getElementById("controls");
const settingsElement = document.getElementById("settings");
const musicsLyricsElement = document.getElementById("musics-lyrics");
const toggleMusicsElement = document.getElementById("toggle-musics");
const toggleLyricsElement = document.getElementById("toggle-lyrics");
const toggleControlsElement = document.getElementById("toggle-controls");
const toggleLyricsFlexDirection = document.getElementById("toggle-lyrics-flex-direction");
const toggleMaximizeElement = document.getElementById("toggle-maximize");
const toggleFullscreenElement = document.getElementById("toggle-fullscreen");
const toggleAlwaysOnTopElement = document.getElementById("toggle-always-on-top");
const quitElement = document.getElementById("quit");

const allMusics = [];
const currentLyricMap = {};
const userDataRoot = app.getPath("userData");
const configFilename = `${userDataRoot}/ice-spring-player.config.json`;

document.addEventListener("DOMContentLoaded", function () {
    loadMusicsFromConfig();
    // loadMusicsFromFilesAndFolders(["/Users/bj/tmp/music"]);
    playPauseElement.click();
});


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

function saveMusicsToConfig(musics) {
    console.log("Saving config:", {musics});
    fs.writeFileSync(configFilename, JSON.stringify({musics}));
}

function loadMusicsFromFilesAndFolders(filesAndFolders) {
    console.log("Load filenames:", eval("new Date().toISOString()+' '+Math.random()"));
    let newMusicFilenames = [];
    for (const item of filesAndFolders) {
        if (fs.lstatSync(item).isDirectory()) {
            const filenames = fs.readdirSync(item).map($ => `${item}/${$}`);
            newMusicFilenames.push(...filenames);
        } else {
            newMusicFilenames.push(item);
        }
    }
    console.log("Filter filenames:", eval("new Date().toISOString()+' '+Math.random()"));
    const oldMusicFilenames = allMusics.map($ => $["filename"]);
    newMusicFilenames = newMusicFilenames
        .filter($ => $.endsWith(".mp3"))
        .filter($ => !oldMusicFilenames.includes($));
    console.log("Parse musics:", eval("new Date().toISOString()+' '+Math.random()"));
    const newMusics = newMusicFilenames.map((filename) => {
        const baseFilename = path.basename(filename);
        const matcher = /(.+)-(.+)\.mp3/.exec(baseFilename);
        const artist = matcher ? matcher[1].trim() : "Unknown";
        const song = matcher ? matcher[2].trim() : baseFilename.replace(".mp3", "").trim();
        return {artist, song, filename};
    });
    if (newMusics.length === 0) return;
    console.log("Loading musics:", eval("new Date().toISOString()+' '+Math.random()"));
    loadMusics(newMusics);
    return newMusics;
}

function loadMusics(newMusics) {
    [...Array(0)].forEach(() => newMusics.push(...newMusics));
    console.log("Loading musics: ", newMusics);
    const allChildren = [];
    newMusics.forEach(({artist, song, filename}) => {
        allMusics.push({artist, song, filename});
        const musicElement = musicTemplate.cloneNode(true);
        musicElement.querySelector(".number").textContent = allMusics.length.toString();
        musicElement.querySelector(".artist").textContent = artist;
        musicElement.querySelector(".song").textContent = song;
        musicElement.setAttribute("data-filename", filename);
        allChildren.push(musicElement);
        musicElement.addEventListener("click", function () {
            if (bodyElement.getAttribute("data-is-dragging") === "false") playMusic(filename);
        });
        const removeElement = musicElement.querySelector("span.remove");
        ["mouseenter", "mouseleave"].forEach($ => removeElement.addEventListener($, function (e) {
            e.type.includes("enter") ? this.classList.add("active") : this.classList.remove("active");
        }));
        removeElement.addEventListener("click", function (e) {
            e.stopPropagation();
            const filename = this.parentElement.getAttribute("data-filename");
            const currentMusicFilename = decodeURI(audioElement.src).replace("file://", "");
            if (filename === currentMusicFilename) {
                if (allMusics.length > 1) playNext(); else stopPlay();
            }
            removeMusic(filename);
        });
    });
    const fragment = document.createDocumentFragment();
    fragment.append(...allChildren);
    // musicsElement.append(...allChildren);
    musicsElement.appendChild(fragment);
    console.log("Elements Loaded:", eval("new Date().toISOString()+' '+Math.random()"));

    allMusics.sort(((a, b) => `${a["artist"]}-${a["song"]}`.localeCompare(`${b["artist"]}-${b["song"]}`)));
    const sortedMusicElements = [...musicsElement.children].sort((a, b) =>
        allMusics.findIndex($ => $["filename"] === a.getAttribute("data-filename")) -
        allMusics.findIndex($ => $["filename"] === b.getAttribute("data-filename"))
    );
    sortedMusicElements.forEach((el, index) => {
        el.querySelector(".number").textContent = (index + 1).toString();
    });
    [...musicsElement.children].forEach($ => $.remove());
    musicsElement.append(...sortedMusicElements);
    console.log("Sorted musics:", allMusics);
}

function removeMusic(filename) {
    allMusics.splice(allMusics.findIndex($ => $["filename"] === filename), 1);
    [...musicsElement.children].filter($ => $.getAttribute("data-filename") === filename).pop().remove();
    [...musicsElement.children].forEach((el, index) => {
        el.querySelector(".number").textContent = (index + 1).toString();
    });
    saveMusicsToConfig(allMusics);
}

audioElement.addEventListener("loadedmetadata", function () {
    const musicFilename = decodeURI(audioElement.src).replace("file://", "");
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

progressBarElement.addEventListener("click", function (e) {
    if (audioElement.paused) return;
    audioElement.currentTime = e.offsetX / this.offsetWidth * audioElement.duration;
});

const playHistory = [];

function playNext() {
    const currentMusicFilename = decodeURI(audioElement.src).replace("file://", "");
    const musicsExceptCurrent = allMusics.filter($ => $["filename"] !== currentMusicFilename);
    if (musicsExceptCurrent.length === 0) return;
    const nextMusicFilename = musicsExceptCurrent[~~(musicsExceptCurrent.length * Math.random())]["filename"];
    playMusic(nextMusicFilename);
}

function playPrevious() {
    playHistory.pop();
    const previousMusicFilename = playHistory.pop();
    if (previousMusicFilename) playMusic(previousMusicFilename); else playNext();
}

function playMusic(filename) {
    audioElement.src = filename;
    audioElement.play().finally();
    audioElement.setAttribute("data-stopped", "false");
    if (!([...playHistory].pop() === filename)) playHistory.push(filename);
}

function stopPlay() {
    if (audioElement.currentTime > 0) {
        audioElement.play();
    }
    audioElement.currentTime = 0;
    audioElement.pause();
    audioElement.setAttribute("data-stopped", "true");
}

playPauseElement.addEventListener("click", function () {
    if (allMusics.length === 0) return;
    if (!audioElement.src || !audioElement.src.endsWith(".mp3")) {
        playNext();
        return;
    }
    if (audioElement.paused) audioElement.play().finally(); else audioElement.pause();
});

[...controlsElement.children].filter($ => $ !== progressLabelElement).forEach($ => $.ondblclick = e => e.stopPropagation());

playNextElement.onclick = playNext;
playPreviousElement.onclick = playPrevious;
stopPlayElement.onclick = stopPlay;

audioElement.addEventListener("playing", function () {
    playPauseElement.firstElementChild.setAttribute("data-icon", "pause");
});

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

audioElement.addEventListener("ended", function () {
    playNext();
});

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
    lyricElement.scrollIntoView({behavior: 'smooth'});

    const positionSeconds = Number.parseInt(this.currentTime);
    const durationSeconds = Number.parseInt(this.duration);
    let progressText = `${~~(positionSeconds / 60)}:${positionSeconds % 60}`;
    progressText += `/${~~(durationSeconds / 60)}:${durationSeconds % 60}`;
    progressText = progressText.replace(/(\d+):(\d)(?!\d)/g, "$1:0$2");
    progressLabelElement.textContent = progressText;
});

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

const layouts = ["musics-lyrics-controls", "musics-controls", "lyrics-controls", "lyrics", "controls"];
let currentLayout = "musics-lyrics-controls";

toggleViewElement.addEventListener("click", function () {
    currentLayout = layouts[layouts.indexOf(currentLayout) + 1];
    if (!currentLayout) currentLayout = layouts[0];
    console.log(currentLayout);
    musicsElement.style.display = currentLayout.includes("musics") ? "block" : "none";
    lyricsElement.style.display = currentLayout.includes("lyrics") ? "flex" : "none";
    controlsElement.style.display = currentLayout.includes("controls") ? "flex" : "none";
    musicsLyricsElement.style.flexGrow = currentLayout.match(/musics|lyrics/) ? "1e9" : "0";
});

["mouseenter", "mouseleave"].forEach($ => settingsElement.addEventListener($, function (e) {
    e.type.includes("enter") ? this.classList.add("active") : this.classList.remove("active");
}));

toggleMusicsElement.addEventListener("click", function () {
    musicsElement.style.display = musicsElement.style.display === "none" ? "flex" : "none";
});

toggleLyricsElement.addEventListener("click", function () {
    lyricsElement.style.display = lyricsElement.style.display === "none" ? "flex" : "none";
});

toggleControlsElement.addEventListener("click", function () {
    controlsElement.style.display = controlsElement.style.display === "none" ? "flex" : "none";
});

const lyricLayouts = ["column", "column-wrap", "row-wrap", "row"];

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
    this.firstElementChild.setAttribute("data-icon", window.isMaximized() ? "arrows-alt" : "expand-arrows-alt");
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

controlsElement.addEventListener("dblclick", function () {
    const window = remote.getCurrentWindow();
    window.setFullScreen(!window.isFullScreen());
});

bodyElement.addEventListener("mousedown", function () {
    bodyElement.setAttribute("data-is-dragging", "false");
});

bodyElement.addEventListener("mousemove", function () {
    bodyElement.setAttribute("data-is-dragging", "true");
});

quitElement.addEventListener("click", function () {
    app.exit();
});

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
