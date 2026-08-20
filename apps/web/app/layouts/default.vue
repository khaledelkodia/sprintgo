<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface shadow-card">
    <header class="sticky top-0 z-30 flex h-14 items-center justify-center border-b border-line bg-surface/95 backdrop-blur">
      <NuxtLink to="/" class="text-lg font-bold text-primary-700">سبرنت جو</NuxtLink>
    </header>
    <main class="flex flex-1 flex-col px-5 py-6">
      <slot />
    </main>
  </div>
</template>
