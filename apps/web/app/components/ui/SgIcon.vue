<script setup lang="ts">
/**
 * Single professional icon set for the whole app (Lucide-style line icons).
 * Feature code uses <SgIcon name="…" /> — never emoji, never inline SVG.
 * Icons inherit `currentColor`, so tint them with text-* utilities.
 */
type Shape =
  | { p: string } // path d
  | { c: [number, number, number] } // circle cx, cy, r
  | { l: [number, number, number, number] } // line x1, y1, x2, y2
  | { pl: string }; // polyline points

const props = withDefaults(
  defineProps<{ name: string; size?: number | string; stroke?: number; fill?: boolean }>(),
  { size: 20, stroke: 2, fill: false },
);

const ICONS: Record<string, Shape[]> = {
  // navigation & generic
  home: [{ p: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }, { p: 'M9 22V12h6v10' }],
  user: [{ p: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }, { c: [12, 7, 4] }],
  users: [
    { p: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
    { c: [9, 7, 4] },
    { p: 'M22 21v-2a4 4 0 0 0-3-3.87' },
    { p: 'M16 3.13a4 4 0 0 1 0 7.75' },
  ],
  shield: [
    { p: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' },
  ],
  'map-pin': [
    { p: 'M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0' },
    { c: [12, 10, 3] },
  ],
  package: [
    { p: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z' },
    { p: 'M3.3 7 12 12l8.7-5' },
    { p: 'M12 22V12' },
  ],
  bag: [{ p: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' }, { p: 'M3 6h18' }, { p: 'M16 10a4 4 0 0 1-8 0' }],
  clock: [{ c: [12, 12, 10] }, { pl: '12 6 12 12 16 14' }],
  star: [
    { p: 'M11.5 3.3a.55.55 0 0 1 1 0l2.2 4.5 4.95.72a.55.55 0 0 1 .3.94l-3.58 3.48.85 4.94a.55.55 0 0 1-.8.58L12 16.6l-4.42 2.32a.55.55 0 0 1-.8-.58l.85-4.94-3.58-3.48a.55.55 0 0 1 .3-.94l4.95-.72z' },
  ],
  plus: [{ p: 'M5 12h14' }, { p: 'M12 5v14' }],
  search: [{ c: [11, 11, 8] }, { p: 'm21 21-4.3-4.3' }],
  phone: [
    { p: 'M13.83 16.57a1 1 0 0 0 1.21-.3l.36-.47A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.47.35a1 1 0 0 0-.29 1.23 14 14 0 0 0 6.39 6.38' },
  ],
  pencil: [
    { p: 'M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z' },
    { p: 'm15 5 4 4' },
  ],
  trash: [
    { p: 'M3 6h18' },
    { p: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' },
    { p: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
    { l: [10, 11, 10, 17] },
    { l: [14, 11, 14, 17] },
  ],
  banknote: [
    { p: 'M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z' },
    { c: [12, 12, 2] },
    { p: 'M6 12h.01' },
    { p: 'M18 12h.01' },
  ],
  note: [{ p: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }, { p: 'M7 9h10' }, { p: 'M7 13h6' }],
  inbox: [
    { pl: '22 12 16 12 14 15 10 15 8 12 2 12' },
    { p: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' },
  ],
  list: [
    { l: [8, 6, 21, 6] },
    { l: [8, 12, 21, 12] },
    { l: [8, 18, 21, 18] },
    { l: [3, 6, 3.01, 6] },
    { l: [3, 12, 3.01, 12] },
    { l: [3, 18, 3.01, 18] },
  ],
  help: [{ c: [12, 12, 10] }, { p: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }, { p: 'M12 17h.01' }],
  info: [{ c: [12, 12, 10] }, { p: 'M12 16v-4' }, { p: 'M12 8h.01' }],
  refresh: [{ p: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }, { p: 'M21 3v5h-5' }],
  chevron: [{ p: 'm15 18-6-6 6-6' }], // points left; add rotate-180 for right
  check: [{ p: 'M20 6 9 17l-5-5' }],
  bell: [
    { p: 'M10.27 21a2 2 0 0 0 3.46 0' },
    { p: 'M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33' },
  ],
  chart: [{ p: 'M3 3v16a2 2 0 0 0 2 2h16' }, { p: 'M18 17V9' }, { p: 'M13 17V5' }, { p: 'M8 17v-3' }],
  trending: [{ pl: '22 7 13.5 15.5 8.5 10.5 2 17' }, { pl: '16 7 22 7 22 13' }],
  truck: [
    { p: 'M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1' },
    { p: 'M15 18H9' },
    { p: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14' },
    { c: [7, 18, 2] },
    { c: [17, 18, 2] },
  ],
  settings: [
    { l: [21, 4, 14, 4] },
    { l: [10, 4, 3, 4] },
    { l: [21, 12, 12, 12] },
    { l: [8, 12, 3, 12] },
    { l: [21, 20, 16, 20] },
    { l: [12, 20, 3, 20] },
    { l: [14, 2, 14, 6] },
    { l: [8, 10, 8, 14] },
    { l: [16, 18, 16, 22] },
  ],
  logout: [
    { p: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' },
    { pl: '16 17 21 12 16 7' },
    { l: [21, 12, 9, 12] },
  ],
  x: [{ p: 'M18 6 6 18' }, { p: 'm6 6 12 12' }],
  filter: [{ p: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z' }],
  // service-type icons (keys match ServiceType.icon in the seed)
  utensils: [
    { p: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2' },
    { p: 'M7 2v20' },
    { p: 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7' },
  ],
  cart: [
    { c: [8, 21, 1] },
    { c: [19, 21, 1] },
    { p: 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12' },
  ],
  pill: [{ p: 'm10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z' }, { p: 'm8.5 8.5 7 7' }],
  leaf: [
    { p: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z' },
    { p: 'M2 21c0-3 1.85-5.36 5.08-6' },
  ],
  bike: [
    { c: [18.5, 17.5, 3.5] },
    { c: [5.5, 17.5, 3.5] },
    { c: [15, 5, 1] },
    { p: 'M12 17.5V14l-3-3 4-3 2 3h2' },
  ],
};

const shapes = computed(() => ICONS[props.name] ?? ICONS.bag!);
const dim = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<template>
  <svg
    :width="dim"
    :height="dim"
    viewBox="0 0 24 24"
    :fill="fill ? 'currentColor' : 'none'"
    :stroke="fill ? 'none' : 'currentColor'"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="inline-block shrink-0"
  >
    <template v-for="(s, i) in shapes" :key="i">
      <path v-if="'p' in s" :d="s.p" />
      <circle v-else-if="'c' in s" :cx="s.c[0]" :cy="s.c[1]" :r="s.c[2]" />
      <line v-else-if="'l' in s" :x1="s.l[0]" :y1="s.l[1]" :x2="s.l[2]" :y2="s.l[3]" />
      <polyline v-else-if="'pl' in s" :points="s.pl" />
    </template>
  </svg>
</template>
