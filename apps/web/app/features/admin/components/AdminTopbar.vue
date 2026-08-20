<script setup lang="ts">
const today = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(
  new Date(),
);
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-surface/90 px-6 backdrop-blur md:px-8"
  >
    <!-- global search -->
    <label
      class="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface-alt px-3.5 text-ink-muted focus-within:border-primary-600/50 focus-within:bg-surface"
    >
      <SgIcon name="search" :size="18" />
      <input
        type="text"
        placeholder="ابحث في المحلات، السواقين، الطلبات…"
        class="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
    </label>

    <div class="flex flex-1 items-center justify-end gap-3">
      <span class="hidden text-sm font-medium text-ink-soft lg:block">{{ today }}</span>
      <button
        type="button"
        class="relative flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:text-ink"
        aria-label="الإشعارات"
      >
        <SgIcon name="bell" :size="19" />
        <span class="absolute end-2.5 top-2.5 size-2 rounded-full bg-secondary-600 ring-2 ring-surface" />
      </button>
    </div>
  </header>
</template>
