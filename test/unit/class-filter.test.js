import { describe, it, expect } from 'vitest';
import { isUnstableClass } from '../../src/class-filter.js';

describe('isUnstableClass', () => {
  // ── Should return true (unstable, must NOT be used as locator) ───────────

  describe('MUI classes', () => {
    it('rejects MuiButton-root', () => expect(isUnstableClass('MuiButton-root')).toBe(true));
    it('rejects MuiButton-contained', () => expect(isUnstableClass('MuiButton-contained')).toBe(true));
    it('rejects MuiTypography-h1', () => expect(isUnstableClass('MuiTypography-h1')).toBe(true));
    it('rejects MuiInputBase-input', () => expect(isUnstableClass('MuiInputBase-input')).toBe(true));
    it('rejects MuiFormControl-root', () => expect(isUnstableClass('MuiFormControl-root')).toBe(true));
  });

  describe('Emotion CSS-in-JS classes', () => {
    it('rejects css-1abc123', () => expect(isUnstableClass('css-1abc123')).toBe(true));
    it('rejects css-xyzabc', () => expect(isUnstableClass('css-xyzabc')).toBe(true));
    it('rejects css-1x5jdmj', () => expect(isUnstableClass('css-1x5jdmj')).toBe(true));
    it('rejects css-0', () => expect(isUnstableClass('css-000')).toBe(true));
  });

  describe('Styled-components classes', () => {
    it('rejects sc-bdnxRM', () => expect(isUnstableClass('sc-bdnxRM')).toBe(true));
    it('rejects sc-hHMYtB', () => expect(isUnstableClass('sc-hHMYtB')).toBe(true));
    it('rejects sc-iQWeBo', () => expect(isUnstableClass('sc-iQWeBo')).toBe(true));
  });

  describe('Chakra UI classes', () => {
    it('rejects chakra-button', () => expect(isUnstableClass('chakra-button')).toBe(true));
    it('rejects chakra-button__icon', () => expect(isUnstableClass('chakra-button__icon')).toBe(true));
    it('rejects chakra-stack', () => expect(isUnstableClass('chakra-stack')).toBe(true));
  });

  describe('Angular Material classes', () => {
    it('rejects mat-button', () => expect(isUnstableClass('mat-button')).toBe(true));
    it('rejects mat-icon-button', () => expect(isUnstableClass('mat-icon-button')).toBe(true));
    it('rejects mat-form-field', () => expect(isUnstableClass('mat-form-field')).toBe(true));
    it('rejects mat-input-element', () => expect(isUnstableClass('mat-input-element')).toBe(true));
  });

  describe('Tailwind: responsive / state variants', () => {
    it('rejects hover:bg-blue-500', () => expect(isUnstableClass('hover:bg-blue-500')).toBe(true));
    it('rejects sm:flex', () => expect(isUnstableClass('sm:flex')).toBe(true));
    it('rejects dark:text-white', () => expect(isUnstableClass('dark:text-white')).toBe(true));
    it('rejects lg:hidden', () => expect(isUnstableClass('lg:hidden')).toBe(true));
    it('rejects focus:ring-2', () => expect(isUnstableClass('focus:ring-2')).toBe(true));
  });

  describe('Tailwind: arbitrary values', () => {
    it('rejects p-[20px]', () => expect(isUnstableClass('p-[20px]')).toBe(true));
    it('rejects w-[calc(100%-2rem)]', () => expect(isUnstableClass('w-[calc(100%-2rem)]')).toBe(true));
    it('rejects top-[117px]', () => expect(isUnstableClass('top-[117px]')).toBe(true));
  });

  describe('Tailwind: spacing utilities', () => {
    it('rejects p-4', () => expect(isUnstableClass('p-4')).toBe(true));
    it('rejects m-2', () => expect(isUnstableClass('m-2')).toBe(true));
    it('rejects px-6', () => expect(isUnstableClass('px-6')).toBe(true));
    it('rejects py-3', () => expect(isUnstableClass('py-3')).toBe(true));
    it('rejects mt-auto', () => expect(isUnstableClass('mt-auto')).toBe(true));
    it('rejects mx-auto', () => expect(isUnstableClass('mx-auto')).toBe(true));
    it('rejects -mt-2 (negative margin)', () => expect(isUnstableClass('-mt-2')).toBe(true));
    it('rejects pb-0', () => expect(isUnstableClass('pb-0')).toBe(true));
  });

  describe('Tailwind: sizing utilities', () => {
    it('rejects w-full', () => expect(isUnstableClass('w-full')).toBe(true));
    it('rejects h-screen', () => expect(isUnstableClass('h-screen')).toBe(true));
    it('rejects min-w-0', () => expect(isUnstableClass('min-w-0')).toBe(true));
    it('rejects max-h-96', () => expect(isUnstableClass('max-h-96')).toBe(true));
    it('rejects w-1/2', () => expect(isUnstableClass('w-1/2')).toBe(true));
    it('rejects size-4', () => expect(isUnstableClass('size-4')).toBe(true));
  });

  describe('Tailwind: color utilities', () => {
    it('rejects bg-blue-500', () => expect(isUnstableClass('bg-blue-500')).toBe(true));
    it('rejects text-red-400', () => expect(isUnstableClass('text-red-400')).toBe(true));
    it('rejects border-gray-200', () => expect(isUnstableClass('border-gray-200')).toBe(true));
    it('rejects ring-indigo-300', () => expect(isUnstableClass('ring-indigo-300')).toBe(true));
    it('rejects from-purple-400', () => expect(isUnstableClass('from-purple-400')).toBe(true));
    it('rejects shadow-gray-100', () => expect(isUnstableClass('shadow-gray-100')).toBe(true));
  });

  describe('Tailwind: text size tokens', () => {
    it('rejects text-sm', () => expect(isUnstableClass('text-sm')).toBe(true));
    it('rejects text-xl', () => expect(isUnstableClass('text-xl')).toBe(true));
    it('rejects text-2xl', () => expect(isUnstableClass('text-2xl')).toBe(true));
    it('rejects text-base', () => expect(isUnstableClass('text-base')).toBe(true));
    it('rejects text-xs', () => expect(isUnstableClass('text-xs')).toBe(true));
  });

  describe('Tailwind: font utilities', () => {
    it('rejects font-bold', () => expect(isUnstableClass('font-bold')).toBe(true));
    it('rejects font-semibold', () => expect(isUnstableClass('font-semibold')).toBe(true));
    it('rejects font-sans', () => expect(isUnstableClass('font-sans')).toBe(true));
    it('rejects font-mono', () => expect(isUnstableClass('font-mono')).toBe(true));
  });

  describe('Tailwind: flex/grid layout', () => {
    it('rejects flex-row', () => expect(isUnstableClass('flex-row')).toBe(true));
    it('rejects flex-col', () => expect(isUnstableClass('flex-col')).toBe(true));
    it('rejects flex-wrap', () => expect(isUnstableClass('flex-wrap')).toBe(true));
    it('rejects flex-1', () => expect(isUnstableClass('flex-1')).toBe(true));
    it('rejects flex-none', () => expect(isUnstableClass('flex-none')).toBe(true));
    it('rejects grid-cols-3', () => expect(isUnstableClass('grid-cols-3')).toBe(true));
    it('rejects grid-rows-4', () => expect(isUnstableClass('grid-rows-4')).toBe(true));
    it('rejects col-span-2', () => expect(isUnstableClass('col-span-2')).toBe(true));
    it('rejects row-span-1', () => expect(isUnstableClass('row-span-1')).toBe(true));
    it('rejects order-1', () => expect(isUnstableClass('order-1')).toBe(true));
    it('rejects gap-4', () => expect(isUnstableClass('gap-4')).toBe(true));
    it('rejects gap-x-2', () => expect(isUnstableClass('gap-x-2')).toBe(true));
    it('rejects space-x-4', () => expect(isUnstableClass('space-x-4')).toBe(true));
  });

  describe('Tailwind: borders / rounded / shadow', () => {
    it('rejects rounded-lg', () => expect(isUnstableClass('rounded-lg')).toBe(true));
    it('rejects rounded-full', () => expect(isUnstableClass('rounded-full')).toBe(true));
    it('rejects rounded (bare)', () => expect(isUnstableClass('rounded')).toBe(true));
    it('rejects shadow-md', () => expect(isUnstableClass('shadow-md')).toBe(true));
    it('rejects shadow (bare)', () => expect(isUnstableClass('shadow')).toBe(true));
    it('rejects border-2', () => expect(isUnstableClass('border-2')).toBe(true));
    it('rejects border (bare)', () => expect(isUnstableClass('border')).toBe(true));
    it('rejects ring-2', () => expect(isUnstableClass('ring-2')).toBe(true));
  });

  describe('Tailwind: animation / transform', () => {
    it('rejects transition', () => expect(isUnstableClass('transition')).toBe(true));
    it('rejects transition-all', () => expect(isUnstableClass('transition-all')).toBe(true));
    it('rejects duration-300', () => expect(isUnstableClass('duration-300')).toBe(true));
    it('rejects ease-in', () => expect(isUnstableClass('ease-in')).toBe(true));
    it('rejects animate-spin', () => expect(isUnstableClass('animate-spin')).toBe(true));
    it('rejects opacity-50', () => expect(isUnstableClass('opacity-50')).toBe(true));
  });

  describe('Tailwind: single-word utilities', () => {
    it('rejects flex', () => expect(isUnstableClass('flex')).toBe(true));
    it('rejects grid', () => expect(isUnstableClass('grid')).toBe(true));
    it('rejects block', () => expect(isUnstableClass('block')).toBe(true));
    it('rejects hidden', () => expect(isUnstableClass('hidden')).toBe(true));
    it('rejects relative', () => expect(isUnstableClass('relative')).toBe(true));
    it('rejects absolute', () => expect(isUnstableClass('absolute')).toBe(true));
    it('rejects fixed', () => expect(isUnstableClass('fixed')).toBe(true));
    it('rejects sticky', () => expect(isUnstableClass('sticky')).toBe(true));
    it('rejects inline', () => expect(isUnstableClass('inline')).toBe(true));
    it('rejects inline-flex', () => expect(isUnstableClass('inline-flex')).toBe(true));
    it('rejects truncate', () => expect(isUnstableClass('truncate')).toBe(true));
    it('rejects uppercase', () => expect(isUnstableClass('uppercase')).toBe(true));
    it('rejects cursor-pointer', () => expect(isUnstableClass('cursor-pointer')).toBe(true));
    it('rejects sr-only', () => expect(isUnstableClass('sr-only')).toBe(true));
    it('rejects overflow-hidden: via overflow- prefix', () => expect(isUnstableClass('overflow-hidden')).toBe(true));
  });

  // ── Should return false (stable, OK to use as locator) ──────────────────

  describe('semantic BEM / domain class names: must NOT be rejected', () => {
    it('allows login-form', () => expect(isUnstableClass('login-form')).toBe(false));
    it('allows checkout-button', () => expect(isUnstableClass('checkout-button')).toBe(false));
    it('allows product-card', () => expect(isUnstableClass('product-card')).toBe(false));
    it('allows nav-link', () => expect(isUnstableClass('nav-link')).toBe(false));
    it('allows header-nav', () => expect(isUnstableClass('header-nav')).toBe(false));
    it('allows form-section', () => expect(isUnstableClass('form-section')).toBe(false));
    it('allows submit-btn', () => expect(isUnstableClass('submit-btn')).toBe(false));
    it('allows search-input', () => expect(isUnstableClass('search-input')).toBe(false));
    it('allows user-avatar', () => expect(isUnstableClass('user-avatar')).toBe(false));
    it('allows sidebar-menu', () => expect(isUnstableClass('sidebar-menu')).toBe(false));
    it('allows card-title', () => expect(isUnstableClass('card-title')).toBe(false));
    it('allows modal-overlay', () => expect(isUnstableClass('modal-overlay')).toBe(false));
    it('allows pagination-prev', () => expect(isUnstableClass('pagination-prev')).toBe(false));
    it('allows dropdown-item', () => expect(isUnstableClass('dropdown-item')).toBe(false));
    it('allows alert-dialog', () => expect(isUnstableClass('alert-dialog')).toBe(false));
    it('allows flex-container (semantic BEM)', () => expect(isUnstableClass('flex-container')).toBe(false));
    it('allows flex-header (semantic BEM)', () => expect(isUnstableClass('flex-header')).toBe(false));
    it('allows grid-header (semantic BEM)', () => expect(isUnstableClass('grid-header')).toBe(false));
    it('allows grid-sidebar (semantic BEM)', () => expect(isUnstableClass('grid-sidebar')).toBe(false));
    it('allows border-box (semantic CSS reset class)', () => expect(isUnstableClass('border-box')).toBe(false));
  });

  describe('short but semantic class names', () => {
    it('allows btn (common stable abbreviation)', () => expect(isUnstableClass('btn')).toBe(false));
    it('allows nav', () => expect(isUnstableClass('nav')).toBe(false));
    it('allows row (generic but short)', () => expect(isUnstableClass('row')).toBe(false));
    it('allows col (generic but short)', () => expect(isUnstableClass('col')).toBe(false));
    it('allows tab', () => expect(isUnstableClass('tab')).toBe(false));
    it('allows tag', () => expect(isUnstableClass('tag')).toBe(false));
    it('allows app', () => expect(isUnstableClass('app')).toBe(false));
    it('allows icon (not a Tailwind class)', () => expect(isUnstableClass('icon')).toBe(false));
  });
});
