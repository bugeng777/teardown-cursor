import {runLive} from './live.js';

// 芝奇幻光戟 Trident Z5 RGB DDR5 as an interactive teardown page: views, isolates, cutaways, XMP/JEDEC, a
// disassembly slider, orbit and zoom, and an auto tour in Chinese when left alone.
// ?record=1 (with ratio=9x16|16x9, subs=zh-en|en) opens the scripted film page used to render the videos.
if (new URLSearchParams(location.search).has('record')) location.replace(`trident-z5-ddr5-record.html${location.search}`);
else runLive();
