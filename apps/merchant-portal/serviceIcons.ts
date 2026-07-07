/**
 * Service icon picker: categories and Lucide icon names.
 * Icons are rendered via lucide-react; custom PNGs can be placed in /public/assets/icons/
 * and referenced by iconId (e.g. 'custom:face-mask.png').
 */
export const SERVICE_ICON_CATEGORIES: { title: string; iconIds: string[] }[] = [
  {
    title: 'Hair & Beauty',
    iconIds: [
      'Sparkles',
      'User',
      'Scissors',
      'Wind',
      'Droplets',
      'Flower2',
      'Heart',
      'Smile',
      'Footprints',
      'CircleUser',
      'Shirt'
    ]
  },
  {
    title: 'Nail & Lash',
    iconIds: [
      'Hand',
      'CircleDot',
      'Paintbrush',
      'Pipette',
      'Sun',
      'Star',
      'Gem',
      'Palette',
      'Brush',
      'Lamp'
    ]
  },
  {
    title: 'Wellness & Massage',
    iconIds: [
      'Activity',
      'Bath',
      'Flame',
      'Leaf',
      'Mountain',
      'Waves',
      'TreePine',
      'Cloud',
      'Moon',
      'Zap'
    ]
  }
];

/** All icon IDs flattened for lookup (e.g. to render in list) */
export const ALL_SERVICE_ICON_IDS = SERVICE_ICON_CATEGORIES.flatMap(c => c.iconIds);
