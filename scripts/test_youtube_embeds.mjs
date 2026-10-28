// Test candidate C418 track video IDs with official YouTube oEmbed API
const candidates = [
  { title: "Moog City", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "oqU153M-o1k", discColor: "#3ab3da" },
  { title: "Wet Hands", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "lq1vZxM-Iic", discColor: "#80c71f" },
  { title: "Moog City 2", artist: "C418", album: "Minecraft - Volume Beta", videoId: "ML0ljUFlv8k", discColor: "#fed83d" },
  { title: "Sweden", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "aBkTkxKDduc", discColor: "#f9801d" },
  { title: "Mice on Venus", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "SUajffqH_zc", discColor: "#c74ebd" },
  { title: "Subwoofer Lullaby", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "GH5_dD6EZno", discColor: "#b02e26" },
  { title: "Dry Hands", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "4i0d6CPLSGo", discColor: "#835432" },
  { title: "Haggstrom", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "JZNy6eHw3FA", discColor: "#5e7c16" },
  { title: "Living Mice", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "aQKGqzjno2g", discColor: "#9d9d97" },
  { title: "Aria Math", artist: "C418", album: "Minecraft - Volume Beta", videoId: "atgjKEgSqSU", discColor: "#169c9c" },
  { title: "Minecraft", artist: "C418", album: "Minecraft - Volume Alpha", videoId: "U3x8PkbP0-Q", discColor: "#3c44aa" }
];

async function checkTrack(track) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${track.videoId}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ...track, embeddable: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ...track,
      embeddable: true,
      status: 200,
      ytTitle: data.title,
      ytAuthor: data.author_name
    };
  } catch (err) {
    return { ...track, embeddable: false, error: err.message };
  }
}

async function main() {
  console.log('Testing video candidates for embed availability...');
  const results = [];
  for (const track of candidates) {
    const res = await checkTrack(track);
    console.log(`- ${track.title} (${track.videoId}): ${res.embeddable ? 'PLAYABLE / EMBEDDABLE' : 'FAILED: ' + (res.error || res.status)}`);
    if (res.embeddable) {
      console.log(`  YT Title: ${res.ytTitle} | Author: ${res.ytAuthor}`);
    }
    results.push(res);
  }

  const playable = results.filter(r => r.embeddable);
  console.log(`\nVerified Playable Tracks: ${playable.length} of ${candidates.length}`);
}

main();
