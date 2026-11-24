export type BusinessTypeOption = {
  id: string;
  label: string;
  custom?: boolean;
};

export type BusinessCategory = {
  id: string;
  label: string;
  types: BusinessTypeOption[];
};

const other: BusinessTypeOption = { id: "other", label: "Other (type it)", custom: true };

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "travel",
    label: "Travel & Tourism",
    types: [
      { id: "travel-agency", label: "Travel agency" },
      { id: "tour-operator", label: "Tour operator" },
      { id: "hotel", label: "Hotel/Homestay" },
      other,
    ],
  },
  {
    id: "education",
    label: "Education & Coaching",
    types: [
      { id: "coaching", label: "Coaching class" },
      { id: "tutor", label: "Tutor" },
      { id: "school", label: "School or college" },
      { id: "online-course", label: "Online course" },
      other,
    ],
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    types: [
      { id: "factory", label: "Factory" },
      { id: "workshop", label: "Workshop" },
      { id: "job-work", label: "Job work" },
      other,
    ],
  },
  {
    id: "online",
    label: "Online Services",
    types: [
      { id: "agency", label: "Online agency" },
      { id: "freelance", label: "Freelance service" },
      { id: "software", label: "Software product" },
      other,
    ],
  },
  {
    id: "retail",
    label: "Retail & E-commerce",
    types: [
      { id: "shop", label: "Shop" },
      { id: "online-store", label: "Online store" },
      { id: "wholesale", label: "Wholesale" },
      other,
    ],
  },
  {
    id: "food",
    label: "Food & Restaurants",
    types: [
      { id: "restaurant", label: "Restaurant" },
      { id: "cafe", label: "Cafe" },
      { id: "cloud-kitchen", label: "Cloud kitchen" },
      { id: "bakery", label: "Bakery" },
      other,
    ],
  },
  {
    id: "fitness",
    label: "Health & Fitness",
    types: [
      { id: "gym", label: "Gym" },
      { id: "yoga", label: "Yoga studio" },
      { id: "coach", label: "Fitness coach" },
      { id: "sports", label: "Sports coaching" },
      other,
    ],
  },
  {
    id: "realestate",
    label: "Real Estate",
    types: [
      { id: "broker", label: "Property broker" },
      { id: "builder", label: "Builder" },
      { id: "rental", label: "Rentals" },
      other,
    ],
  },
  {
    id: "beauty",
    label: "Beauty & Salon",
    types: [
      { id: "salon", label: "Salon" },
      { id: "spa", label: "Spa" },
      { id: "home-service", label: "Home beauty service" },
      other,
    ],
  },
  {
    id: "professional",
    label: "Professional Services",
    types: [
      { id: "accountant", label: "Accountant" },
      { id: "consultant", label: "Consultant" },
      { id: "legal", label: "Legal office" },
      { id: "studio", label: "Design or marketing studio" },
      other,
    ],
  },
  {
    id: "events",
    label: "Events",
    types: [
      { id: "planner", label: "Event planner" },
      { id: "venue", label: "Venue" },
      { id: "decorator", label: "Decorator" },
      other,
    ],
  },
  {
    id: "other",
    label: "Other",
    types: [other],
  },
];

export function categoryById(id: string | null | undefined) {
  return BUSINESS_CATEGORIES.find((category) => category.id === id) || null;
}

export function typeById(categoryId: string | null | undefined, typeId: string | null | undefined) {
  return categoryById(categoryId)?.types.find((type) => type.id === typeId) || null;
}
