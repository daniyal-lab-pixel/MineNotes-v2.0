const testIds = [
  // Mice on Venus candidates
  { name: 'Mice on Venus 1', id: 'Gx-zZ5v938g' },
  { name: 'Mice on Venus 2', id: '1z2V_M0nB44' },
  { name: 'Mice on Venus 3', id: '5i_w0y3_X4M' },
  { name: 'Mice on Venus 4', id: 'DZ47H84Bc_Q' },
  { name: 'Mice on Venus 5', id: 'qq-RGFxxq0U' },

  // Subwoofer Lullaby candidates
  { name: 'Subwoofer Lullaby 1', id: 'yX9a1g0r5y4' },
  { name: 'Subwoofer Lullaby 2', id: '3wP_vP5J49Y' },
  { name: 'Subwoofer Lullaby 3', id: 'kK_H5W_69eI' },
  { name: 'Subwoofer Lullaby 4', id: '5b9Z_xQf0aM' },

  // Minecraft track candidates
  { name: 'Minecraft 1', id: '5qap5aO4i9A' },
  { name: 'Minecraft 2', id: 'zDu1b_4833c' },
  { name: 'Minecraft 3', id: 'Ntsn_N4U0oI' },
  { name: 'Minecraft 4', id: 'g3F9Fj4_Z3U' }
];

async function check() {
  for (const item of testIds) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${item.id}&format=json`);
      if (res.ok) {
        const d = await res.json();
        console.log(`[OK] ${item.name} (${item.id}): "${d.title}" by ${d.author_name}`);
      } else {
        console.log(`[FAIL ${res.status}] ${item.name} (${item.id})`);
      }
    } catch (e) {
      console.log(`[ERR] ${item.name}: ${e.message}`);
    }
  }
}

check();
