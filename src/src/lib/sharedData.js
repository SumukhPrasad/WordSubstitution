import { writable } from 'svelte/store';

export let currentSearchAndResults = writable({});

export let currentWord = writable({});