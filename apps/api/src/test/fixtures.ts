import type { BriefInput } from '@ai-post-recipe/shared'

export const gymbeamBrief = (): BriefInput => ({
  brandName: 'GymBeam Hrvatska',
  instagramUrl: 'https://www.instagram.com/gymbeamhr/',
  reason: 'Recommended brand with a large product range and an active profile.',
  links: [{ type: 'SHOP', url: 'https://gymbeam.hr' }],
  products: [{ name: 'True Whey', url: 'https://gymbeam.hr/true-whey' }],
  audience: 'Active adults 18–35 in Croatia',
  goals: 'More saves and product interest',
  language: 'hr',
})
