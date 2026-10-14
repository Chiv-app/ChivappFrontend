const YOUTUBE_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)[\w-]+/i;
const VIMEO_PATTERN = /^(https?:\/\/)?(www\.)?(vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/i;

function isSupportedVideoUrl(url) {
    const trimmed = url.trim();
    if (!trimmed) return false;
    return YOUTUBE_PATTERN.test(trimmed) || VIMEO_PATTERN.test(trimmed);
}

const linkData = {
    musician: {
        videos: ['https://www.youtube.com/watch?v=bqAcB5IdNfc', 'https://www.youtube.com/watch?v=OpstwHg3FiQ'],
        showreel_video_url: null
    }
};

const videoList = [];
if (linkData.musician.showreel_video_url) {
    linkData.musician.showreel_video_url.split(',').forEach(v => {
        const clean = v.trim();
        if (clean && !videoList.includes(clean)) videoList.push(clean);
    });
}
if (linkData.musician.videos) {
    linkData.musician.videos.forEach(v => {
        if (typeof v === 'string') {
            v.split(',').forEach(subV => {
                const clean = subV.trim();
                if (clean && !videoList.includes(clean)) videoList.push(clean);
            });
        }
    });
}

console.log("videoList:", videoList);
console.log("Supported:");
videoList.forEach(v => {
    console.log(v, "=>", isSupportedVideoUrl(v));
});
