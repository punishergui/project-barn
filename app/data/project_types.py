PROJECT_TYPE_CONFIG = {
  'cow': {
    'label': 'Beef Cattle', 'emoji': '🐄',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Complete a 4-H enrollment form',
      'Identify and record animal ID (ear tag/registration)',
      'Record daily feed amounts accurately',
      'Weigh animal and calculate ADG',
      'Administer vaccinations with proper records',
      'Properly fit and show animal in halter class',
      'Complete financial record book',
    ]
  },
  'dairy': {
    'label': 'Dairy Cattle', 'emoji': '🐄',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Identify dairy breeds by sight',
      'Record milk production data',
      'Properly fit and lead dairy animal',
      'Complete health and vaccination records',
      'Calculate cost of production',
    ]
  },
  'pig': {
    'label': 'Swine', 'emoji': '🐷',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Record ear notch identification',
      'Track daily feed intake',
      'Calculate feed conversion ratio',
      'Drive/show pig correctly',
      'Complete withdrawal period records',
    ]
  },
  'goat': {
    'label': 'Goat', 'emoji': '🐐',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Record USDA Scrapie tag number',
      'Properly brace/pose goat for judging',
      'Identify and treat internal parasites (FAMACHA)',
      'Record CD-T vaccination dates',
      'Complete financial records',
    ]
  },
  'sheep': {
    'label': 'Sheep / Lamb', 'emoji': '🐑',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Record USDA Scrapie tag number',
      'Set up lamb properly for judging',
      'Complete health and vaccination records',
      'Calculate ADG and projected fair weight',
      'Complete financial records',
    ]
  },
  'chicken': {
    'label': 'Poultry', 'emoji': '🐔',
    'is_livestock': True,
    'modules': ['feed','health','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Verify NPIP flock certification',
      'Identify breed, class, and variety',
      'Properly present bird for showmanship',
      'Record feed and care activities',
    ]
  },
  'rabbit': {
    'label': 'Rabbit', 'emoji': '🐇',
    'is_livestock': True,
    'modules': ['feed','health','weight','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Record permanent tattoo number (left ear)',
      'Identify breed standard for your breed',
      'Pose rabbit for judging',
      'Record feed and health activities',
      'Complete financial records',
    ]
  },
  'horse': {
    'label': 'Horse / Equine', 'emoji': '🐴',
    'is_livestock': True,
    'modules': ['feed','health','shows','gallery',
                'expenses','income','goals','activity','narrative'],
    'default_skills': [
      'Record Coggins test date and result',
      'Complete horsemanship advancement level requirements',
      'Log training sessions with notes',
      'Track farrier and dental appointments',
      'Complete equipment inventory',
    ]
  },
  'baking': {
    'label': 'Baking / Food & Nutrition', 'emoji': '🍰',
    'is_livestock': False,
    'modules': ['materials','skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'material_label': 'Ingredients',
    'material_placeholder': 'e.g. All-purpose flour, Butter',
    'material_unit_placeholder': 'e.g. cups, oz, lbs',
    'default_skills': [
      'Measure ingredients accurately',
      'Practice knife safety',
      'Demonstrate food safety and handwashing',
      'Read and follow a recipe completely',
      'Identify MyPlate food groups',
      'Plan a balanced meal',
      'Complete a Food Preparation Record',
    ]
  },
  'sewing': {
    'label': 'Sewing / Clothing', 'emoji': '🧵',
    'is_livestock': False,
    'modules': ['materials','skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'material_label': 'Fabric & Notions',
    'material_placeholder': 'e.g. Cotton fabric, Thread, Zipper',
    'material_unit_placeholder': 'e.g. yards, spools, each',
    'default_skills': [
      'Thread sewing machine correctly',
      'Sew a straight seam with consistent seam allowance',
      'Press seams open with iron',
      'Attach a button',
      'Insert a zipper',
      'Follow pattern cutting layout',
      'Complete a Sewing Skills Card',
    ]
  },
  'shooting': {
    'label': 'Shooting Sports', 'emoji': '🎯',
    'is_livestock': False,
    'modules': ['skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'default_skills': [
      'Complete Hunter Safety certification',
      'Demonstrate all firearm safety rules',
      'Properly store and transport equipment',
      'Record scores by position (Prone/Standing/Kneeling)',
      'Clean and maintain equipment after each use',
    ]
  },
  'garden': {
    'label': 'Horticulture / Garden', 'emoji': '🌱',
    'is_livestock': False,
    'modules': ['materials','skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'material_label': 'Planting Supplies',
    'material_placeholder': 'e.g. Tomato seeds, Fertilizer',
    'material_unit_placeholder': 'e.g. packets, lbs, bags',
    'default_skills': [
      'Identify 10 common vegetables or flowers by name',
      'Prepare and amend garden soil',
      'Record planting dates and varieties',
      'Identify and control 3 common pests',
      'Record harvest dates and yields',
      'Demonstrate proper watering technique',
    ]
  },
  'robotics': {
    'label': 'Robotics / STEM', 'emoji': '🤖',
    'is_livestock': False,
    'modules': ['materials','skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'material_label': 'Components & Parts',
    'material_placeholder': 'e.g. LEGO Mindstorms kit, Servo motor',
    'material_unit_placeholder': 'e.g. each, kits',
    'default_skills': [
      'Design robot to complete a defined task',
      'Write and modify code/program',
      'Test design and document results in engineering notebook',
      'Compete in or demonstrate at an event',
      'Present project to a judge or audience',
    ]
  },
  'photography': {
    'label': 'Photography / Arts', 'emoji': '📷',
    'is_livestock': False,
    'modules': ['skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'default_skills': [
      'Identify rule of thirds and apply to a photo',
      'Demonstrate proper exposure settings',
      'Edit a photo using basic software',
      'Mount portfolio photos on salon mounts',
      'Write a reflection for each portfolio image',
    ]
  },
  'other': {
    'label': 'Other Project', 'emoji': '📋',
    'is_livestock': False,
    'modules': ['materials','skills','shows','gallery',
                'expenses','goals','activity','narrative'],
    'material_label': 'Materials',
    'material_placeholder': 'e.g. Lumber, Paint, Leather',
    'material_unit_placeholder': 'e.g. each, lbs, yards',
    'default_skills': []
  }
}
