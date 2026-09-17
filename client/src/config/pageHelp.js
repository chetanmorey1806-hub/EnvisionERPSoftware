import { pageHelpHi } from './pageHelpHi';

/**
 * PAGE HELP — English / मराठी / हिंदी guidance for every screen.
 *
 * Keyed by route path. Resolution uses the longest matching prefix, so
 * `/students/new` and `/students/5/edit` fall back to `/students` if they have
 * no entry of their own.
 *
 * Shape:
 *   purpose  — one line: what this page is for
 *   steps    — numbered: how to actually use it
 *   submit   — how to fill the form and save (only on pages with a form)
 *   tips     — gotchas worth knowing
 *
 * Hindi lives in ./pageHelpHi.js and is folded in below, so the three languages
 * stay editable independently but resolve through one lookup.
 */
const pageHelpEnMr = {
  '/dashboard': {
    en: {
      title: 'Dashboard',
      purpose: 'A live snapshot of the whole institute — students, fees, attendance and alerts.',
      steps: [
        'Read the top cards: total students, active courses, batches and pending admissions.',
        'The second row shows money: fees collected, collected this month, and outstanding dues.',
        'Red "Drop-out risk" card lists students who are missing classes or assignments — click through to act.',
        'Amber "Escalated feedback" card shows anonymous complaints that need your attention.',
      ],
      tips: ['Numbers update in real time — no refresh needed.', 'A fresh install shows 0 everywhere until you add data.'],
    },
    mr: {
      title: 'डॅशबोर्ड',
      purpose: 'संपूर्ण संस्थेचा थेट आढावा — विद्यार्थी, फी, हजेरी आणि सूचना.',
      steps: [
        'वरची कार्डे पहा: एकूण विद्यार्थी, चालू कोर्सेस, बॅचेस आणि प्रलंबित प्रवेश.',
        'दुसऱ्या रांगेत पैशांची माहिती: जमा झालेली फी, या महिन्यातील जमा, आणि थकबाकी.',
        'लाल "Drop-out risk" कार्डमध्ये वर्ग किंवा असाइनमेंट चुकवणारे विद्यार्थी दिसतात — क्लिक करून कारवाई करा.',
        'पिवळ्या "Escalated feedback" कार्डमध्ये अनामिक तक्रारी दिसतात, ज्याकडे लक्ष द्यावे.',
      ],
      tips: ['आकडे रिअल-टाइम अपडेट होतात — रिफ्रेश करण्याची गरज नाही.', 'नवीन सिस्टीममध्ये डेटा भरेपर्यंत सर्वत्र ० दिसेल.'],
    },
  },

  '/documents': {
    en: {
      title: 'Document Vault',
      purpose: 'Your own private drive inside the ERP — upload documents, sort them into folders, tag them, and share them with named people.',
      steps: [
        'MY FILES is your own vault. Nobody else can see it unless you share something.',
        'Click a folder to open it; the breadcrumb above the grid takes you back.',
        'Use the All / Folders / Files chips to narrow what the grid shows, and the tag chips to filter by tag.',
        'Search finds folders and files by name across your WHOLE vault, not just the folder you are in.',
        'Hover any card for its actions: download, share, rename, delete.',
        'SHARED WITH ME lists what other people gave you. SHARED BY ME lists what you gave away — and lets you take it back.',
      ],
      submit:
        'To add a document press "Upload": drop a file (or click to browse), optionally rename it, tick the tags that apply, and press "Upload". To make a folder press "New Folder", type a name and press "Create folder".\n\nTo share, hover an item and press the share icon: pick the people, choose "View only" or "View & download", optionally set an expiry date, and press "Share with".',
      tips: [
        'Sharing a FOLDER also shares everything inside it — including files you add to it later.',
        '"View only" means they can open it but not save a copy. "View & download" lets them keep it.',
        'Deleting a folder also deletes every file inside it.',
        'Admins can see every vault under the "All Files" tab; ordinary users only ever see their own.',
      ],
    },
    mr: {
      title: 'डॉक्युमेंट व्हॉल्ट',
      purpose: 'ERP मधील तुमची स्वतःची खाजगी ड्राइव्ह — कागदपत्रे अपलोड करा, फोल्डरमध्ये लावा, टॅग करा आणि ठराविक लोकांसोबत शेअर करा.',
      steps: [
        'MY FILES म्हणजे तुमचा स्वतःचा व्हॉल्ट. तुम्ही शेअर केल्याशिवाय ते इतर कोणालाही दिसत नाही.',
        'फोल्डर उघडण्यासाठी त्यावर क्लिक करा; वरील ब्रेडक्रंबवरून मागे जाता येते.',
        'All / Folders / Files चिप्सने काय दिसावे ते ठरवा, आणि टॅग चिप्सने टॅगनुसार फिल्टर करा.',
        'सर्च संपूर्ण व्हॉल्टमध्ये नावाने फोल्डर व फाइल शोधतो — फक्त सध्याच्या फोल्डरमध्ये नाही.',
        'कोणत्याही कार्डवर माउस नेल्यास क्रिया दिसतात: डाउनलोड, शेअर, नाव बदला, काढून टाका.',
        'SHARED WITH ME मध्ये इतरांनी तुम्हाला दिलेले दिसते. SHARED BY ME मध्ये तुम्ही दिलेले दिसते — आणि ते परतही घेता येते.',
      ],
      submit:
        'कागदपत्र जोडण्यासाठी "Upload" दाबा: फाइल टाका (किंवा क्लिक करून निवडा), हवे असल्यास नाव बदला, लागू टॅग निवडा, आणि "Upload" दाबा. फोल्डर तयार करण्यासाठी "New Folder" दाबा, नाव लिहा आणि "Create folder" दाबा.\n\nशेअर करण्यासाठी कार्डवर माउस नेऊन शेअर चिन्ह दाबा: व्यक्ती निवडा, "View only" किंवा "View & download" निवडा, हवे असल्यास समाप्ती तारीख द्या, आणि "Share with" दाबा.',
      tips: [
        'फोल्डर शेअर केल्यास त्यातील सर्व काही शेअर होते — नंतर जोडलेल्या फाइल्ससुद्धा.',
        '"View only" म्हणजे ते उघडू शकतात पण प्रत जतन करू शकत नाहीत. "View & download" मध्ये ते ठेवूही शकतात.',
        'फोल्डर काढून टाकल्यास त्यातील प्रत्येक फाइलही निघून जाते.',
        'अ‍ॅडमिनला "All Files" टॅबमध्ये सर्वांचे व्हॉल्ट दिसतात; सामान्य वापरकर्त्याला फक्त स्वतःचेच.',
      ],
    },
  },









  '/students': {
    en: {
      title: 'Student Directory',
      purpose: 'The master list of every student, with their course, batch and drop-out risk.',
      steps: [
        'Use the search box to find a student by name, email or admission number.',
        'Use the status filter to see only Active, Completed, Dropped or Suspended students.',
        'The "Retention" column flags students at risk — red = high risk, amber = watch.',
        'Click the pencil (✏️) on any row to edit that student.',
      ],
      submit: 'Click "New Student" (top-right) to admit a student. Fill the name (required), then course and batch, then click "Admit student".',
      tips: ['Only students with an active enrollment appear in a trainer\'s roster.', 'A student flagged red is missing classes — contact them.'],
    },
    mr: {
      title: 'विद्यार्थी यादी',
      purpose: 'सर्व विद्यार्थ्यांची मुख्य यादी — त्यांचा कोर्स, बॅच आणि ड्रॉप-आउट धोका.',
      steps: [
        'नाव, ईमेल किंवा प्रवेश क्रमांकाने विद्यार्थी शोधण्यासाठी सर्च बॉक्स वापरा.',
        'फक्त Active, Completed, Dropped किंवा Suspended विद्यार्थी पाहण्यासाठी स्टेटस फिल्टर वापरा.',
        '"Retention" रकान्यात धोका दाखवला जातो — लाल = जास्त धोका, पिवळा = लक्ष ठेवा.',
        'कोणत्याही ओळीवरील पेन्सिल (✏️) वर क्लिक करून त्या विद्यार्थ्याची माहिती बदला.',
      ],
      submit: 'नवीन विद्यार्थी घेण्यासाठी उजवीकडे वरती "New Student" वर क्लिक करा. नाव (आवश्यक) भरा, नंतर कोर्स आणि बॅच निवडा, आणि "Admit student" दाबा.',
      tips: ['फक्त सक्रिय प्रवेश असलेले विद्यार्थी ट्रेनरच्या यादीत दिसतात.', 'लाल दाखवलेला विद्यार्थी वर्ग चुकवत आहे — त्याच्याशी संपर्क करा.'],
    },
  },

  '/students/new': {
    en: {
      title: 'New Student Admission — how to fill this form',
      purpose: 'Register a new student and allocate them to a course and batch.',
      steps: [
        'STUDENT DETAILS: type the full name (this is the only required field). Add mobile, email, date of birth, gender and highest qualification.',
        'COURSE & BATCH: pick the Course first — the Batch list then shows only batches of that course.',
        'Set the Admission date and Status (leave as "active" for a new student).',
        'GUARDIAN: add the parent/guardian name and mobile for emergencies.',
      ],
      submit: 'Click "Admit student" (top-right) to save. If a field is invalid, a red message appears at the top telling you exactly what to fix. Click "Cancel" to leave without saving.',
      tips: [
        'The admission number is generated automatically — you do not type it.',
        'Pick the Course before the Batch, or the batch list will not filter.',
      ],
    },
    mr: {
      title: 'नवीन विद्यार्थी प्रवेश — हा फॉर्म कसा भरायचा',
      purpose: 'नवीन विद्यार्थ्याची नोंदणी करा आणि त्याला कोर्स व बॅच द्या.',
      steps: [
        'विद्यार्थ्याची माहिती: पूर्ण नाव लिहा (हेच एकमेव आवश्यक फील्ड आहे). मोबाईल, ईमेल, जन्मतारीख, लिंग आणि शिक्षण भरा.',
        'कोर्स आणि बॅच: आधी कोर्स निवडा — मग बॅचच्या यादीत फक्त त्या कोर्सच्या बॅचेस दिसतील.',
        'प्रवेश तारीख आणि स्टेटस निवडा (नवीन विद्यार्थ्यासाठी "active" ठेवा).',
        'पालक: आपत्कालीन संपर्कासाठी पालकाचे नाव आणि मोबाईल भरा.',
      ],
      submit: 'सेव्ह करण्यासाठी उजवीकडे वरती "Admit student" दाबा. काही चूक असल्यास वरती लाल रंगात नेमकी चूक दिसेल. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा.',
      tips: [
        'प्रवेश क्रमांक आपोआप तयार होतो — तो टाइप करावा लागत नाही.',
        'आधी कोर्स निवडा, नाहीतर बॅचची यादी फिल्टर होणार नाही.',
      ],
    },
  },

  '/students/:id/edit': {
    en: {
      title: 'Edit Student — how to change and save',
      purpose: 'Update an existing student: their details, course/batch allocation or status.',
      steps: [
        'The form opens pre-filled with the current record.',
        'Change only what you need — everything else stays as it is.',
        'To move the student to another course, pick the new Course first, then the Batch.',
        'To mark them as finished or left, change the Status (completed / dropped / suspended).',
      ],
      submit: 'Click "Update student" (top-right) to save your changes. If something is invalid, a red message at the top says exactly what to fix. Click "Cancel" to leave WITHOUT saving — nothing is changed.',
      tips: [
        'Changing status to "completed" or "dropped" also closes their open batch enrollments.',
        'The admission number cannot be changed — it is permanent.',
      ],
    },
    mr: {
      title: 'विद्यार्थी बदला — कसे बदलायचे आणि सेव्ह करायचे',
      purpose: 'सध्याच्या विद्यार्थ्याची माहिती, कोर्स/बॅच किंवा स्थिती बदला.',
      steps: [
        'फॉर्म आधीच भरलेला उघडतो.',
        'फक्त जे बदलायचे तेच बदला — बाकी सर्व तसेच राहते.',
        'दुसऱ्या कोर्समध्ये हलवायचे असल्यास आधी नवीन कोर्स निवडा, मग बॅच.',
        'कोर्स पूर्ण झाला किंवा सोडला असल्यास Status बदला (completed / dropped / suspended).',
      ],
      submit: 'बदल सेव्ह करण्यासाठी उजवीकडे वरती "Update student" दाबा. काही चूक असल्यास वरती लाल रंगात नेमकी चूक दिसेल. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा — काहीही बदलणार नाही.',
      tips: [
        'Status "completed" किंवा "dropped" केल्यास त्याची चालू बॅच नोंदही बंद होते.',
        'प्रवेश क्रमांक बदलता येत नाही — तो कायमचा असतो.',
      ],
    },
  },

  '/trainers': {
    en: {
      title: 'Trainers',
      purpose: 'The master list of all trainers (faculty) at the institute.',
      steps: [
        'Search a trainer by name, department or specialisation.',
        'Click a trainer to view or edit their profile — department, qualification, experience.',
        'Assign a trainer to a batch from the Batches page, not here.',
      ],
      submit: 'Use the "Add" button at the top to create a trainer. Fill name and email, then save.',
      tips: [
        'A trainer can only log in once their profile is linked to a user account — that happens automatically when they register.',
        'The system blocks assigning a trainer to two overlapping batches.',
      ],
    },
    mr: {
      title: 'ट्रेनर्स',
      purpose: 'संस्थेतील सर्व ट्रेनर्सची (शिक्षकांची) मुख्य यादी.',
      steps: [
        'नाव, विभाग किंवा स्पेशलायझेशनने ट्रेनर शोधा.',
        'प्रोफाइल पाहण्यासाठी/बदलण्यासाठी ट्रेनरवर क्लिक करा — विभाग, पात्रता, अनुभव.',
        'ट्रेनरला बॅच देण्यासाठी Batches पेज वापरा, इथे नाही.',
      ],
      submit: 'नवीन ट्रेनर जोडण्यासाठी वरती "Add" बटण वापरा. नाव आणि ईमेल भरून सेव्ह करा.',
      tips: [
        'ट्रेनरने रजिस्टर केल्यावर त्याचे प्रोफाइल आपोआप जोडले जाते, तेव्हाच तो लॉगिन करू शकतो.',
        'एकाच वेळेच्या दोन बॅचेस एका ट्रेनरला देता येत नाहीत — सिस्टीम अडवते.',
      ],
    },
  },

  '/courses': {
    en: {
      title: 'Course Catalog',
      purpose: 'All courses the institute offers, with their schedule, trainer and fee.',
      steps: [
        'The table shows each course with its duration, fee, trainer and batch dates.',
        '"Not scheduled" means the course exists but has no batch yet — students cannot join until you schedule one.',
        'Use search to find a course by name or code.',
      ],
      submit:
        'Click "Add New Course" (top-right). Fill COURSE DETAILS (code and name are required), then tick "Schedule the first batch now" to also set dates, timings, trainer and classroom. Click "Create course & schedule".',
      tips: [
        'The system checks for trainer double-booking, classroom clashes, seating capacity and operating hours BEFORE saving. If there is a conflict, nothing is created and a red message tells you exactly what clashed.',
        'You can create the course alone and schedule the batch later — just untick the schedule box.',
      ],
    },
    mr: {
      title: 'कोर्स यादी',
      purpose: 'संस्थेतील सर्व कोर्सेस — त्यांचे वेळापत्रक, ट्रेनर आणि फी.',
      steps: [
        'तक्त्यात प्रत्येक कोर्सचा कालावधी, फी, ट्रेनर आणि बॅचच्या तारखा दिसतात.',
        '"Not scheduled" म्हणजे कोर्स आहे पण बॅच नाही — बॅच तयार केल्याशिवाय विद्यार्थी जोडता येणार नाहीत.',
        'नाव किंवा कोडने कोर्स शोधण्यासाठी सर्च वापरा.',
      ],
      submit:
        'उजवीकडे वरती "Add New Course" दाबा. कोर्सची माहिती भरा (कोड आणि नाव आवश्यक). नंतर "Schedule the first batch now" वर टिक करून तारखा, वेळ, ट्रेनर आणि क्लासरूम निवडा. शेवटी "Create course & schedule" दाबा.',
      tips: [
        'सेव्ह करण्याआधी सिस्टीम ट्रेनरची डबल-बुकिंग, क्लासरूमची टक्कर, बसण्याची क्षमता आणि कामाच्या वेळा तपासते. टक्कर असल्यास काहीही तयार होत नाही आणि लाल रंगात कारण दिसते.',
        'फक्त कोर्स तयार करून बॅच नंतरही ठेवता येते — टिक काढून टाका.',
      ],
    },
  },

  '/courses/new': {
    en: {
      title: 'New Course — how to fill this form',
      purpose: 'Create a course, and optionally schedule its first batch in the same step.',
      steps: [
        'COURSE DETAILS: type a short unique course code (e.g. PY-101) and the course name. These two are required — everything else is optional.',
        'Fill department, duration, credits and fee. The fee is what a student is billed for the whole course.',
        'Tick "Schedule the first batch now" if classes are ready to start. Untick it to register the curriculum only.',
        'FIRST BATCH: give the batch a code and name, pick the start/end dates, the daily start/end time, and tap the weekdays it runs on.',
        'Choose the trainer and the classroom, and set how many seats the batch has.',
      ],
      submit:
        'Press "Create course & schedule" (top-right). The course and the batch are written together in one transaction — if the schedule clashes with anything, NOTHING is created and the red banner tells you exactly what clashed. Press "Cancel" to leave without saving.',
      tips: [
        'Before saving, the server checks five things: trainer double-booking, the trainer\'s daily batch limit, room double-booking, seating capacity, and the institute\'s operating hours.',
        'A batch with no weekdays ticked is treated as running EVERY day, and will clash with everything. Always tick the real days.',
      ],
    },
    mr: {
      title: 'नवीन कोर्स — हा फॉर्म कसा भरायचा',
      purpose: 'कोर्स तयार करा, आणि हवे असल्यास त्याच वेळी पहिली बॅचही ठरवा.',
      steps: [
        'कोर्सची माहिती: छोटा युनिक कोर्स कोड (उदा. PY-101) आणि कोर्सचे नाव लिहा. हे दोनच आवश्यक आहेत — बाकी सर्व ऐच्छिक.',
        'विभाग, कालावधी, क्रेडिट्स आणि फी भरा. फी म्हणजे संपूर्ण कोर्ससाठी विद्यार्थ्याला लागणारी रक्कम.',
        'वर्ग सुरू होणार असतील तर "Schedule the first batch now" वर टिक करा. फक्त कोर्स नोंदवायचा असेल तर टिक काढा.',
        'पहिली बॅच: बॅचचा कोड आणि नाव द्या, सुरू/शेवटची तारीख, रोजची वेळ निवडा, आणि कोणत्या वारी वर्ग होणार त्या दिवसांवर टॅप करा.',
        'ट्रेनर आणि क्लासरूम निवडा, आणि बॅचमध्ये किती जागा आहेत ते भरा.',
      ],
      submit:
        'उजवीकडे वरती "Create course & schedule" दाबा. कोर्स आणि बॅच एकाच व्यवहारात लिहिले जातात — वेळापत्रकात टक्कर असल्यास काहीही तयार होत नाही आणि लाल पट्टीत नेमके कारण दिसते. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा.',
      tips: [
        'सेव्ह करण्याआधी सर्व्हर पाच गोष्टी तपासतो: ट्रेनरची डबल-बुकिंग, ट्रेनरची रोजची बॅच मर्यादा, खोलीची डबल-बुकिंग, बसण्याची क्षमता, आणि संस्थेच्या कामाच्या वेळा.',
        'एकही वार न निवडलेली बॅच "दररोज" चालते असे मानले जाते आणि सगळ्याशी टक्कर देते. खरे दिवस नेहमी निवडा.',
      ],
    },
  },

  '/courses/:id/edit': {
    en: {
      title: 'Edit Course — how to change and save',
      purpose: 'Update a course. Its timings live on its batches, so they are changed from the batch form.',
      steps: [
        'The form opens pre-filled with the current course.',
        'Change only what needs changing — everything else stays as it is.',
        'Fee, duration and description can be updated at any time.',
      ],
      submit:
        'Press "Update course" (top-right) to save. Press "Cancel" to leave without saving — nothing changes.',
      tips: [
        'To change class dates, timings, trainer or classroom, edit the BATCH, not the course.',
        'The course code must stay unique across the institute.',
      ],
    },
    mr: {
      title: 'कोर्स बदला — कसे बदलायचे आणि सेव्ह करायचे',
      purpose: 'कोर्स अपडेट करा. वेळा बॅचवर असतात, त्यामुळे त्या बॅच फॉर्ममधून बदला.',
      steps: [
        'फॉर्म सध्याच्या माहितीसह भरलेला उघडतो.',
        'जे बदलायचे तेवढेच बदला — बाकी तसेच राहते.',
        'फी, कालावधी आणि वर्णन कधीही बदलता येते.',
      ],
      submit:
        'सेव्ह करण्यासाठी उजवीकडे वरती "Update course" दाबा. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा — काहीही बदलणार नाही.',
      tips: [
        'वर्गाच्या तारखा, वेळा, ट्रेनर किंवा क्लासरूम बदलायचे असतील तर कोर्स नव्हे, बॅच बदला.',
        'कोर्स कोड संस्थेत युनिक असावा लागतो.',
      ],
    },
  },

  '/trainers/new': {
    en: {
      title: 'New Trainer — how to fill this form',
      purpose: 'Add a trainer so they can be assigned to batches.',
      steps: [
        'TRAINER DETAILS: full name is required. Everything else is optional but worth filling.',
        'Give their email — it is used for their login and for institute email alerts.',
        'ROLE & EXPERTISE: department, designation, the subjects they can actually teach, qualification and years of experience.',
        'Leave Status as "active" unless they have already left.',
      ],
      submit:
        'Press "Add trainer" (top-right). Press "Cancel" to leave without saving.',
      tips: [
        'A trainer who signs up on the trainer portal gets their record created automatically on OTP verification — you do not need to add them twice.',
        'Assign batches from the BATCH form, not here.',
      ],
    },
    mr: {
      title: 'नवीन ट्रेनर — हा फॉर्म कसा भरायचा',
      purpose: 'ट्रेनर जोडा जेणेकरून त्यांना बॅच नेमून देता येईल.',
      steps: [
        'ट्रेनरची माहिती: पूर्ण नाव आवश्यक आहे. बाकी सर्व ऐच्छिक, पण भरणे उपयोगी.',
        'ईमेल द्या — तोच त्यांच्या लॉगिनसाठी आणि संस्थेच्या ईमेल सूचनांसाठी वापरला जातो.',
        'भूमिका आणि तज्ज्ञता: विभाग, पदनाम, ते प्रत्यक्षात कोणते विषय शिकवू शकतात, शिक्षण आणि अनुभवाची वर्षे.',
        'ते सोडून गेले नसतील तर Status "active" ठेवा.',
      ],
      submit:
        'उजवीकडे वरती "Add trainer" दाबा. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा.',
      tips: [
        'ट्रेनर पोर्टलवर स्वतः नोंदणी करणाऱ्या ट्रेनरची नोंद OTP पडताळणीवर आपोआप तयार होते — दोनदा जोडायची गरज नाही.',
        'बॅच नेमून देणे इथे नाही, बॅच फॉर्ममधून करा.',
      ],
    },
  },

  '/trainers/:id/edit': {
    en: {
      title: 'Edit Trainer — how to change and save',
      purpose: 'Update a trainer\'s profile, expertise or status.',
      steps: [
        'The form opens pre-filled.',
        'Change only what needs changing.',
        'Set Status to "inactive" when a trainer leaves — they stay on past records but cannot take new batches.',
      ],
      submit:
        'Press "Update trainer" (top-right) to save. Press "Cancel" to leave without saving.',
      tips: [
        'Changing the email changes the address their alerts go to.',
        'Their anonymous student ratings are on the Trainer Performance page, not here.',
      ],
    },
    mr: {
      title: 'ट्रेनर बदला — कसे बदलायचे आणि सेव्ह करायचे',
      purpose: 'ट्रेनरची माहिती, तज्ज्ञता किंवा स्थिती बदला.',
      steps: [
        'फॉर्म भरलेला उघडतो.',
        'जे बदलायचे तेवढेच बदला.',
        'ट्रेनर सोडून गेल्यास Status "inactive" करा — जुन्या नोंदींवर ते राहतात पण नवीन बॅच घेता येत नाही.',
      ],
      submit:
        'सेव्ह करण्यासाठी उजवीकडे वरती "Update trainer" दाबा. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा.',
      tips: [
        'ईमेल बदलल्यास त्यांच्या सूचना नव्या पत्त्यावर जातात.',
        'त्यांचे गुप्त विद्यार्थी रेटिंग इथे नाही, Trainer Performance पेजवर दिसते.',
      ],
    },
  },

  '/batches/new': {
    en: {
      title: 'New Batch — how to fill this form',
      purpose: 'Schedule a real batch: which course, at what time, with which trainer, in which room.',
      steps: [
        'BATCH DETAILS: batch code, batch name and the course are required.',
        'SCHEDULE: pick the start date, the daily start and end time, and tap the weekdays the class runs on.',
        'TRAINER & ROOM: choose the trainer and the classroom, then set the number of seats.',
        'If you type more seats than the room holds, a red warning appears immediately.',
      ],
      submit:
        'Press "Create batch" (top-right). The server re-checks everything before writing the row — trainer double-booking, the trainer\'s daily limit, room clashes, capacity and operating hours. If any check fails, the batch is NOT created and the reason appears in the red banner.',
      tips: [
        'A batch with no start/end time is treated as ALL DAY, and one with no weekdays as EVERY DAY — both will clash with everything. Always set real timings.',
        'Students are attached to a batch from the student form or at admission.',
      ],
    },
    mr: {
      title: 'नवीन बॅच — हा फॉर्म कसा भरायचा',
      purpose: 'खरी बॅच ठरवा: कोणता कोर्स, कोणत्या वेळी, कोणत्या ट्रेनरसह, कोणत्या खोलीत.',
      steps: [
        'बॅचची माहिती: बॅच कोड, बॅचचे नाव आणि कोर्स आवश्यक आहेत.',
        'वेळापत्रक: सुरू तारीख, रोजची सुरू आणि शेवटची वेळ निवडा, आणि वर्ग कोणत्या वारी होतो त्या दिवसांवर टॅप करा.',
        'ट्रेनर आणि खोली: ट्रेनर आणि क्लासरूम निवडा, मग किती जागा आहेत ते भरा.',
        'खोलीच्या क्षमतेपेक्षा जास्त जागा लिहिल्यास लगेच लाल इशारा दिसतो.',
      ],
      submit:
        'उजवीकडे वरती "Create batch" दाबा. नोंद लिहिण्याआधी सर्व्हर सर्वकाही पुन्हा तपासतो — ट्रेनरची डबल-बुकिंग, ट्रेनरची रोजची मर्यादा, खोलीची टक्कर, क्षमता आणि कामाच्या वेळा. कोणतीही तपासणी अयशस्वी झाल्यास बॅच तयार होत नाही आणि कारण लाल पट्टीत दिसते.',
      tips: [
        'वेळ न दिलेली बॅच "पूर्ण दिवस" आणि वार न दिलेली बॅच "दररोज" मानली जाते — दोन्ही सगळ्याशी टक्कर देतात. नेहमी खऱ्या वेळा भरा.',
        'विद्यार्थी बॅचला विद्यार्थी फॉर्ममधून किंवा प्रवेशाच्या वेळी जोडले जातात.',
      ],
    },
  },

  '/batches/:id/edit': {
    en: {
      title: 'Edit Batch — how to change and save',
      purpose: 'Change a batch\'s timings, trainer, room or status.',
      steps: [
        'The form opens pre-filled with the current schedule.',
        'Change the timings, weekdays, trainer or room as needed.',
        'Set Status to "completed" when the batch finishes, or "cancelled" if it never ran.',
      ],
      submit:
        'Press "Update batch" (top-right). The conflict checks run again on the CHANGED schedule — moving a batch onto a time the trainer or room is already busy will be rejected, and the batch stays as it was.',
      tips: [
        'The batch is checked against every OTHER batch, never against itself — so re-saving without changes always works.',
        'Reducing seats below the number of students already enrolled will be rejected.',
      ],
    },
    mr: {
      title: 'बॅच बदला — कसे बदलायचे आणि सेव्ह करायचे',
      purpose: 'बॅचची वेळ, ट्रेनर, खोली किंवा स्थिती बदला.',
      steps: [
        'फॉर्म सध्याच्या वेळापत्रकासह भरलेला उघडतो.',
        'गरजेनुसार वेळा, वार, ट्रेनर किंवा खोली बदला.',
        'बॅच संपल्यावर Status "completed" करा, आणि ती कधीच सुरू झाली नसेल तर "cancelled" करा.',
      ],
      submit:
        'उजवीकडे वरती "Update batch" दाबा. बदललेल्या वेळापत्रकावर टक्कर-तपासणी पुन्हा चालते — ट्रेनर किंवा खोली आधीच व्यस्त असलेल्या वेळेत बॅच हलवल्यास ते नाकारले जाते आणि बॅच जशी होती तशीच राहते.',
      tips: [
        'बॅच नेहमी इतर बॅचशी तपासली जाते, स्वतःशी नाही — त्यामुळे बदल न करता पुन्हा सेव्ह केल्यास नेहमी चालते.',
        'आधीच प्रवेश घेतलेल्या विद्यार्थ्यांपेक्षा कमी जागा केल्यास ते नाकारले जाईल.',
      ],
    },
  },

  '/batches': {
    en: {
      title: 'Batches',
      purpose: 'Scheduled runs of a course — with timings, trainer, classroom and students.',
      steps: [
        'Each batch shows its course, trainer, timing and how many students are enrolled.',
        'Assign a trainer to a batch here — the system blocks a clash.',
        'Students are added to a batch from the Students page or on admission.',
      ],
      submit: 'Click the add button, fill batch code, name, timings and days, then save.',
      tips: [
        'A batch with no start/end time is treated as "all day, every day" and will clash with everything — always set real timings.',
        'Seats cannot exceed the classroom capacity.',
      ],
    },
    mr: {
      title: 'बॅचेस',
      purpose: 'कोर्सच्या प्रत्यक्ष तुकड्या — वेळ, ट्रेनर, क्लासरूम आणि विद्यार्थ्यांसह.',
      steps: [
        'प्रत्येक बॅचचा कोर्स, ट्रेनर, वेळ आणि किती विद्यार्थी आहेत ते दिसते.',
        'इथेच ट्रेनर नेमा — वेळ जुळल्यास सिस्टीम अडवते.',
        'विद्यार्थी Students पेजवरून किंवा प्रवेशाच्या वेळी बॅचमध्ये जोडले जातात.',
      ],
      submit: 'Add बटण दाबा, बॅच कोड, नाव, वेळ आणि दिवस भरा, आणि सेव्ह करा.',
      tips: [
        'वेळ न भरलेली बॅच "दिवसभर, रोज" मानली जाते आणि प्रत्येक गोष्टीशी टक्कर देते — नेहमी खरी वेळ भरा.',
        'जागा क्लासरूमच्या क्षमतेपेक्षा जास्त ठेवता येत नाहीत.',
      ],
    },
  },

  '/rooms': {
    en: {
      title: 'Classrooms & Labs',
      purpose: 'The physical rooms a batch can be scheduled into.',
      steps: [
        'The list shows each room, its type (classroom or lab), seats and whether it is free.',
        'Filter by Classroom or Lab using the chips.',
        '"In use" tells you how many active batches occupy that room.',
      ],
      submit: 'Click "Add Room". Fill room code and name (required), choose Classroom or Lab, set seating capacity and location, then click "Add room".',
      tips: [
        'Seating capacity matters: a batch with more seats than the room holds will be REJECTED when scheduling.',
        'Two batches cannot use the same room at overlapping times.',
      ],
    },
    mr: {
      title: 'क्लासरूम आणि लॅब',
      purpose: 'ज्या प्रत्यक्ष खोल्यांमध्ये बॅच घेता येते.',
      steps: [
        'यादीत प्रत्येक खोली, तिचा प्रकार (क्लासरूम/लॅब), जागा आणि रिकामी आहे का ते दिसते.',
        'चिप्स वापरून Classroom किंवा Lab असे फिल्टर करा.',
        '"In use" म्हणजे त्या खोलीत सध्या किती बॅचेस चालू आहेत.',
      ],
      submit: '"Add Room" दाबा. खोलीचा कोड आणि नाव भरा (आवश्यक), Classroom की Lab निवडा, बसण्याची क्षमता आणि जागा भरा, आणि "Add room" दाबा.',
      tips: [
        'बसण्याची क्षमता महत्त्वाची: खोलीपेक्षा जास्त जागा असलेली बॅच शेड्यूल करताना नाकारली जाईल.',
        'एकाच वेळी दोन बॅचेस एकाच खोलीत ठेवता येत नाहीत.',
      ],
    },
  },

  '/partners': {
    en: {
      title: 'Corporate Partners',
      purpose: 'The companies the institute does business with — they sponsor corporate training batches and they hire our students.',
      steps: [
        'The table lists every partner with their PAN, GSTIN, corporate office and training venue.',
        'Search matches the company name, PAN, GSTIN or city.',
        'The coloured badge says what the relationship is: Hiring, Training, or both.',
        'Click the blue contacts pill on the right to expand the people at that company — their designation, phone and email.',
        'Row buttons: pencil edits, the list icon expands contacts, the bin deletes.',
      ],
      submit:
        'Press "Add Partner" (top-right) to open the form. Press "Deleted" to switch to the deleted list, where each row has a restore button.',
      tips: [
        'Deleting is SOFT — the partner moves to the "Deleted" list and their invoices and placement history are kept. Nothing is lost, and you can restore them.',
        'The primary contact is the one shown first, and is who the team should call by default.',
      ],
    },
    mr: {
      title: 'कॉर्पोरेट भागीदार',
      purpose: 'संस्था ज्यांच्याशी व्यवहार करते त्या कंपन्या — त्या कॉर्पोरेट ट्रेनिंग बॅच प्रायोजित करतात आणि आपल्या विद्यार्थ्यांना नोकरी देतात.',
      steps: [
        'तक्त्यात प्रत्येक भागीदाराचा पॅन, जीएसटीआयएन, मुख्य कार्यालय आणि ट्रेनिंगचे ठिकाण दिसते.',
        'सर्चमध्ये कंपनीचे नाव, पॅन, जीएसटीआयएन किंवा शहर चालते.',
        'रंगीत बॅज नाते सांगतो: नोकरी, ट्रेनिंग, किंवा दोन्ही.',
        'उजवीकडील निळ्या संपर्क गोळीवर क्लिक करून त्या कंपनीतील माणसे उघडा — पदनाम, फोन आणि ईमेल.',
        'ओळीतील बटणे: पेन्सिल बदलते, यादी-चिन्ह संपर्क उघडते, कचरापेटी काढून टाकते.',
      ],
      submit:
        'फॉर्म उघडण्यासाठी उजवीकडे वरती "Add Partner" दाबा. काढून टाकलेले पाहण्यासाठी "Deleted" दाबा — तिथे प्रत्येक ओळीवर परत आणण्याचे बटण असते.',
      tips: [
        'काढून टाकणे "सॉफ्ट" आहे — भागीदार "Deleted" यादीत जातो आणि त्याची बिले व प्लेसमेंट इतिहास तसाच राहतो. काहीही हरवत नाही, परत आणता येते.',
        'मुख्य संपर्क सर्वात आधी दिसतो — डिफॉल्टने टीमने त्यालाच फोन करावा.',
      ],
    },
  },

  '/partners/new': {
    en: {
      title: 'New Partner — how to fill this form',
      purpose: 'Add a company that will sponsor training, hire students, or both.',
      steps: [
        'COMPANY: the company name is required. Pick the relationship — Hiring, Corporate training, or both.',
        'TAX IDENTITY: type the GSTIN and the PAN fills itself in, because a GSTIN carries the PAN inside it (characters 3–12).',
        'ADDRESSES: the corporate office address is what gets printed on their invoice. The training venue is only needed when training runs at their site instead of our campus.',
        'CONTACT PEOPLE: press "Add contact" for each person — name, designation, phone, email. Tick "Primary contact" for the one the team should call first.',
      ],
      submit:
        'Press "Add partner" (top-right). If the PAN or GSTIN is malformed, or the two disagree with each other, the form says so in red and the save button stays disabled until you fix it.',
      tips: [
        'PAN looks like ABCDE1234F. GSTIN is 15 characters: state code + PAN + 3 more.',
        'A GSTIN can only belong to one partner — reusing one is rejected and names the company that already has it.',
        'Only one contact can be primary; ticking a new one unticks the old.',
      ],
    },
    mr: {
      title: 'नवीन भागीदार — हा फॉर्म कसा भरायचा',
      purpose: 'ट्रेनिंग प्रायोजित करणारी, विद्यार्थ्यांना नोकरी देणारी, किंवा दोन्ही करणारी कंपनी जोडा.',
      steps: [
        'कंपनी: कंपनीचे नाव आवश्यक आहे. नाते निवडा — नोकरी, कॉर्पोरेट ट्रेनिंग, किंवा दोन्ही.',
        'कर-ओळख: जीएसटीआयएन लिहिल्यास पॅन आपोआप भरतो, कारण जीएसटीआयएनमध्येच पॅन असतो (३ ते १२ अक्षरे).',
        'पत्ते: मुख्य कार्यालयाचा पत्ता त्यांच्या बिलावर छापला जातो. ट्रेनिंग आपल्या कॅम्पसऐवजी त्यांच्या ठिकाणी होत असेल तरच ट्रेनिंगचे ठिकाण भरा.',
        'संपर्क व्यक्ती: प्रत्येक माणसासाठी "Add contact" दाबा — नाव, पदनाम, फोन, ईमेल. टीमने आधी ज्याला फोन करावा त्याला "Primary contact" टिक करा.',
      ],
      submit:
        'उजवीकडे वरती "Add partner" दाबा. पॅन किंवा जीएसटीआयएन चुकीचा असेल, किंवा दोघांचे जुळत नसेल, तर लाल रंगात कारण दिसते आणि दुरुस्त करेपर्यंत सेव्ह बटण बंदच राहते.',
      tips: [
        'पॅन ABCDE1234F असा असतो. जीएसटीआयएन १५ अक्षरांचा: राज्य कोड + पॅन + आणखी ३.',
        'एक जीएसटीआयएन एकाच भागीदाराचा असू शकतो — तोच पुन्हा वापरल्यास नाकारला जातो आणि तो आधीच कोणाकडे आहे ते सांगितले जाते.',
        'फक्त एकच संपर्क मुख्य असू शकतो; नवा टिक केल्यास जुना निघतो.',
      ],
    },
  },

  '/partners/:id/edit': {
    en: {
      title: 'Edit Partner — how to change and save',
      purpose: 'Update a partner\'s details, tax identity, addresses or contact people.',
      steps: [
        'The form opens pre-filled, with the existing contacts listed at the bottom.',
        'Change only what needs changing.',
        'Edit a contact in place, add a new one with "Add contact", or press "Remove" to delete one.',
      ],
      submit:
        'Press "Update partner" (top-right). Contacts are saved along with the partner. Press "Cancel" to leave without saving.',
      tips: [
        'Removing a contact takes effect immediately — it is not undone by pressing Cancel.',
        'Changing the GSTIN re-runs the same validation as a new partner, including the check that no other partner already uses it.',
      ],
    },
    mr: {
      title: 'भागीदार बदला — कसे बदलायचे आणि सेव्ह करायचे',
      purpose: 'भागीदाराची माहिती, कर-ओळख, पत्ते किंवा संपर्क व्यक्ती बदला.',
      steps: [
        'फॉर्म भरलेला उघडतो, खाली सध्याचे संपर्क दिसतात.',
        'जे बदलायचे तेवढेच बदला.',
        'संपर्क जागच्या जागी बदला, "Add contact" ने नवा जोडा, किंवा "Remove" दाबून काढून टाका.',
      ],
      submit:
        'उजवीकडे वरती "Update partner" दाबा. संपर्कही भागीदारासोबतच सेव्ह होतात. सेव्ह न करता बाहेर पडण्यासाठी "Cancel" दाबा.',
      tips: [
        'संपर्क काढून टाकल्यास तो लगेच निघतो — "Cancel" दाबून तो परत येत नाही.',
        'जीएसटीआयएन बदलल्यास नव्या भागीदारासारखीच तपासणी पुन्हा होते, तो दुसऱ्या कोणाकडे आधीच नाही याचीही.',
      ],
    },
  },

  '/staff': {
    en: {
      title: 'Staff',
      purpose: 'Non-teaching staff — front office, accounts, administration.',
      steps: ['Search staff by name or department.', 'Click a row to edit their details and permissions.'],
      submit: 'Use the add button, fill name and department, then save.',
      tips: ['Staff permissions are controlled from Settings → Roles & Permissions.'],
    },
    mr: {
      title: 'कर्मचारी',
      purpose: 'शिकवणी न करणारे कर्मचारी — कार्यालय, हिशोब, प्रशासन.',
      steps: ['नाव किंवा विभागाने कर्मचारी शोधा.', 'माहिती व परवानग्या बदलण्यासाठी ओळीवर क्लिक करा.'],
      submit: 'Add बटण वापरा, नाव आणि विभाग भरा, सेव्ह करा.',
      tips: ['कर्मचाऱ्यांच्या परवानग्या Settings → Roles & Permissions मधून ठरतात.'],
    },
  },

  '/enquiries': {
    en: {
      title: 'Enquiries (Leads)',
      purpose: 'Every person who enquired about a course — track them until they join.',
      steps: [
        'The KPI strip shows total leads, hot leads, callbacks due today, and your conversion rate.',
        'Filter by temperature: Hot (very interested), Warm, Cold.',
        'Tick "Callbacks due" to see only the people you promised to call back.',
        'Change a lead\'s temperature straight from the dropdown in its row.',
        'Click "Callback" to schedule a follow-up call — the lead moves to "contacted" automatically.',
      ],
      submit:
        'Click "+ Log New Lead". Name and Phone are required. Add the course they want, their qualification, and where they came from (walk-in, website, referral). Click "Save Lead". To turn a lead into a student, click the green "Convert" button — it creates the student and admission in one click.',
      tips: [
        'Convert requires a course — if the lead has none, you will be asked to pick one.',
        'A converted lead cannot be converted twice.',
      ],
    },
    mr: {
      title: 'चौकशी (Leads)',
      purpose: 'कोर्सबद्दल चौकशी करणारी प्रत्येक व्यक्ती — प्रवेश होईपर्यंत पाठपुरावा करा.',
      steps: [
        'वरच्या पट्टीत एकूण लीड्स, हॉट लीड्स, आजचे कॉलबॅक आणि कन्व्हर्जन रेट दिसतो.',
        'तापमानानुसार फिल्टर करा: Hot (खूप इच्छुक), Warm, Cold.',
        'फक्त ज्यांना फोन करायचा आहे ते पाहण्यासाठी "Callbacks due" वर टिक करा.',
        'ओळीतील ड्रॉपडाउनमधून लीडचे तापमान लगेच बदला.',
        'फॉलो-अप कॉल ठरवण्यासाठी "Callback" दाबा — लीड आपोआप "contacted" होते.',
      ],
      submit:
        '"+ Log New Lead" दाबा. नाव आणि फोन आवश्यक आहेत. त्यांना हवा असलेला कोर्स, शिक्षण आणि ते कुठून आले (walk-in, website, referral) भरा. "Save Lead" दाबा. लीडचा विद्यार्थी करण्यासाठी हिरवे "Convert" बटण दाबा — एका क्लिकमध्ये विद्यार्थी आणि प्रवेश तयार होतो.',
      tips: [
        'Convert साठी कोर्स लागतो — नसल्यास तुम्हाला निवडायला सांगितले जाईल.',
        'एकदा कन्व्हर्ट झालेली लीड पुन्हा कन्व्हर्ट होत नाही.',
      ],
    },
  },

  '/followups': {
    en: {
      title: 'Follow-ups',
      purpose: 'The call log for every lead — who was called, when, and what is next.',
      steps: ['See all pending follow-ups sorted by date.', 'Open a lead to add a new follow-up note.'],
      submit: 'Add a follow-up with a note and the next callback date, then save.',
      tips: ['Follow-ups are created automatically when you schedule a callback from the Enquiries page.'],
    },
    mr: {
      title: 'पाठपुरावा',
      purpose: 'प्रत्येक लीडचा कॉल-लॉग — कोणाला, कधी फोन केला आणि पुढे काय.',
      steps: ['सर्व प्रलंबित पाठपुरावे तारखेनुसार पहा.', 'नवीन नोंद जोडण्यासाठी लीड उघडा.'],
      submit: 'नोंद आणि पुढील कॉलबॅक तारीख भरून सेव्ह करा.',
      tips: ['Enquiries पेजवरून कॉलबॅक ठरवल्यास पाठपुरावा आपोआप तयार होतो.'],
    },
  },

  '/admissions': {
    en: {
      title: 'Admissions',
      purpose: 'Applications from enquiry to approval.',
      steps: [
        'Review each application and check the documents.',
        'Change the status: pending → verified → approved (or rejected).',
        'Approving an application automatically creates the student record.',
      ],
      submit: 'Open an application, verify the documents, then set the status to "approved".',
      tips: ['Approve only after documents are verified and the initial fee is received.'],
    },
    mr: {
      title: 'प्रवेश',
      purpose: 'चौकशीपासून मंजुरीपर्यंतचे अर्ज.',
      steps: [
        'प्रत्येक अर्ज तपासा आणि कागदपत्रे पडताळा.',
        'स्टेटस बदला: pending → verified → approved (किंवा rejected).',
        'अर्ज मंजूर केल्यावर विद्यार्थ्याची नोंद आपोआप तयार होते.',
      ],
      submit: 'अर्ज उघडा, कागदपत्रे तपासा, आणि स्टेटस "approved" करा.',
      tips: ['कागदपत्रे तपासून आणि पहिली फी आल्यावरच मंजुरी द्या.'],
    },
  },

  '/fees': {
    en: {
      title: 'Fee Collection',
      purpose: 'Everything about money: what students owe, what a course costs, what the institute spends, and whether it made a profit.',
      steps: [
        'DUES — everyone with an overdue installment, worst delay first. Late fees are shown separately from the fee itself.',
        'FEE PLANS — a plan is the price of a course: base fee + registration + GST, and how many installments it splits into.',
        'EXPENSES — rent, utilities, salaries, marketing. This is the other half of the books.',
        'PROFIT & LOSS — money collected minus money spent for the period, plus "revenue leakage" (billed, overdue, never collected).',
      ],
      submit:
        'To bill a student: Fee plans → "Assign to a student" → pick the student and plan, add any discount, and the schedule of dated installments is generated for you. To take money: Dues → Collect. The payment is applied to the OLDEST unpaid installment first.',
      tips: [
        'You cannot collect more than is outstanding — the server refuses it.',
        'Overdue installments and late fees are raised automatically every night. "Run overdue check" just does it now instead of waiting.',
        'A fine can only be waived with a written reason, and it is recorded against your name.',
        'Reassigning a plan is refused once a student has paid anything, so a schedule cannot be rewritten underneath them.',
      ],
    },
    mr: {
      title: 'फी वसुली',
      purpose: 'पैशाशी संबंधित सर्व काही: विद्यार्थ्यांची थकबाकी, कोर्सची किंमत, संस्थेचा खर्च आणि नफा-तोटा.',
      steps: [
        'थकबाकी — ज्यांचे हप्ते थकले आहेत ते, सर्वाधिक विलंब आधी. विलंब शुल्क वेगळे दाखवले जाते.',
        'फी योजना — योजना म्हणजे कोर्सची किंमत: मूळ फी + नोंदणी + जीएसटी, आणि किती हप्त्यांत विभागणी.',
        'खर्च — भाडे, वीज-पाणी, पगार, जाहिरात. हा हिशेबाचा दुसरा अर्धा भाग.',
        'नफा-तोटा — जमा वजा खर्च, आणि "महसूल गळती" (बिल झाले, थकीत, कधीच जमा नाही).',
      ],
      submit:
        'विद्यार्थ्याला फी लावण्यासाठी: फी योजना → "विद्यार्थ्याला लागू करा" → विद्यार्थी व योजना निवडा, सूट द्या — तारखांसह हप्त्यांचे वेळापत्रक आपोआप तयार होते. पैसे घेण्यासाठी: थकबाकी → जमा करा. रक्कम सर्वात जुन्या थकीत हप्त्याला आधी लावली जाते.',
      tips: [
        'बाकी रकमेपेक्षा जास्त घेता येत नाही — सर्व्हर नाकारतो.',
        'थकीत हप्ते व विलंब शुल्क दररोज रात्री आपोआप लागतात. "थकीत तपासणी चालवा" ते आत्ता करते.',
        'दंड फक्त लेखी कारणासह माफ होतो आणि तो तुमच्या नावावर नोंदवला जातो.',
        'विद्यार्थ्याने काही भरले असल्यास योजना पुन्हा लागू करता येत नाही.',
      ],
    },
  },



  '/my-classes': {
    en: {
      title: 'My Classes (Trainer)',
      purpose: 'Your day: today\'s classes, attendance, daily topics and materials.',
      steps: [
        'Pick a date at the top (defaults to today).',
        'Each class card shows the time, how many students, and whether attendance and topics are done.',
        'Click a class to open it. Three tabs appear: Attendance, Topics, Materials.',
        'ATTENDANCE: tap P / A / L for each student, or use "All present". Click "Save Attendance".',
        'TOPICS: write what you taught today and the duration, then "Log Topics".',
        'MATERIALS: upload slides, code or lab files for your students.',
      ],
      submit: 'Each tab has its own save button — Save Attendance, Log Topics, Upload. Saving topics again for the same day updates the existing entry (it does not duplicate).',
      tips: [
        'You can only see and edit batches assigned to YOU.',
        'Mark attendance within the first 15–20 minutes of class.',
      ],
    },
    mr: {
      title: 'माझे वर्ग (ट्रेनर)',
      purpose: 'तुमचा दिवस: आजचे वर्ग, हजेरी, दैनंदिन विषय आणि साहित्य.',
      steps: [
        'वरती तारीख निवडा (डिफॉल्ट आजची).',
        'प्रत्येक वर्गाच्या कार्डवर वेळ, विद्यार्थी संख्या, आणि हजेरी/विषय झाले का ते दिसते.',
        'वर्ग उघडण्यासाठी क्लिक करा. तीन टॅब दिसतील: Attendance, Topics, Materials.',
        'हजेरी: प्रत्येक विद्यार्थ्यासाठी P / A / L दाबा, किंवा "All present" वापरा. मग "Save Attendance" दाबा.',
        'विषय: आज काय शिकवले आणि किती वेळ ते लिहा, मग "Log Topics" दाबा.',
        'साहित्य: विद्यार्थ्यांसाठी स्लाइड्स, कोड किंवा लॅब फाइल्स अपलोड करा.',
      ],
      submit: 'प्रत्येक टॅबला स्वतःचे सेव्ह बटण आहे — Save Attendance, Log Topics, Upload. त्याच दिवसाचे विषय पुन्हा सेव्ह केल्यास जुनीच नोंद अपडेट होते (डुप्लिकेट होत नाही).',
      tips: [
        'फक्त तुम्हाला दिलेल्या बॅचेस तुम्ही पाहू आणि बदलू शकता.',
        'वर्ग सुरू झाल्यावर पहिल्या १५–२० मिनिटांत हजेरी घ्या.',
      ],
    },
  },

  '/classroom': {
    en: {
      title: 'Classroom',
      purpose: 'Google Classroom inside the ERP: every batch is a class with a stream, classwork, people and grades.',
      steps: [
        'CLASSES: each card is one batch. Trainers see the class code and how much work is waiting to be reviewed; students see what is due soon.',
        'STUDENTS join a class with "Join class" and the 7-character code from their trainer.',
        'STREAM: the teacher posts announcements (with a file if needed); everyone can comment. New classwork shows up here too, and "Upcoming" lists work due in the next 7 days.',
        'CLASSWORK: press "Create" for an Assignment, a Question (typed answer), Material (no submission) or a Topic. Work is grouped by topic.',
        'Open any piece of work to see instructions, class comments and, for a teacher, every student\'s status: assigned, turned in, done late, missing, draft grade or returned.',
        'PEOPLE: the teacher and the students. Teachers can copy the class code and remove a student.',
        'GRADES (teachers): every student against every graded item, with averages. Type in a cell to draft a grade; "Export to Excel" downloads the gradebook.',
      ],
      submit: 'TEACHER: open the work, type a grade (and feedback) for a student and press Save. That is a DRAFT the student cannot see. Tick the students and press "Return" to release grades and feedback to them.\n\nSTUDENT: open the work, add a file or write your answer, and press "Turn in". You can "Unsubmit" to change it until your trainer grades it. Use Private comments to ask your trainer something only they will see.',
      tips: [
        'The class settings (gear on the class page) change the banner colour and description, reset the class code, or stop students joining with the code.',
        'Work turned in after the due time is marked "Done late" automatically; work never turned in becomes "Missing".',
        'A removed student cannot rejoin with the code. Add them back from their student record.',
        'Classes come from batches: schedule a batch with a trainer and its class appears here.',
      ],
    },
    mr: {
      title: 'क्लासरूम',
      purpose: 'क्लासवर्क आणि होमवर्क — ट्रेनर देतो, विद्यार्थी सबमिट करतो.',
      steps: [
        'ट्रेनर: तुमच्या बॅचेससाठी दिलेले सर्व काम दिसते. प्रकार किंवा बॅचनुसार फिल्टर करा.',
        'कोणावरही "View submissions" दाबून कोणी सबमिट केले ते पहा, फाइल डाउनलोड करा, आणि गुण द्या.',
        'विद्यार्थी: तुम्हाला दिलेले काम दिसते. मुदत संपलेली कामे लाल रंगात दिसतात.',
      ],
      submit:
        'ट्रेनर — "Publish work" दाबा: बॅच आणि प्रकार निवडा (Classwork / Homework / Lab / Material), शीर्षक व सूचना लिहा, वेळ आणि शेवटची तारीख भरा, फाइल जोडा, आणि "Publish" दाबा. विद्यार्थ्यांना लगेच सूचना जाते.\n\nविद्यार्थी — "Submit work" दाबा: नोंद लिहा, फाइल जोडा (ZIP, PDF, DOC किंवा फोटो, २५ MB पर्यंत), आणि "Submit" दाबा. पुन्हा सबमिट केल्यास जुनी फाइल बदलली जाते.',
      tips: [
        'मुदतीनंतर सबमिट केल्यास आपोआप "late" म्हणून नोंद होते.',
        'ट्रेनर फक्त स्वतःच्या बॅचेसना काम देऊ शकतो.',
      ],
    },
  },

  '/attendance': {
    en: {
      title: 'Attendance',
      purpose: 'The attendance register for every batch.',
      steps: [
        'Choose a batch and a date to open the register.',
        'Mark each student Present, Absent or Late.',
        'The percentage is calculated automatically.',
      ],
      submit: 'Mark every student, then click Save. Saving again for the same date updates the marks (it does not duplicate).',
      tips: [
        'Students below 75% attendance are automatically warned by email.',
        'Three absences in a row flags the student as a drop-out risk on the admin dashboard.',
      ],
    },
    mr: {
      title: 'हजेरी',
      purpose: 'प्रत्येक बॅचचे हजेरीपत्रक.',
      steps: [
        'बॅच आणि तारीख निवडून हजेरीपत्रक उघडा.',
        'प्रत्येक विद्यार्थ्याला Present, Absent किंवा Late करा.',
        'टक्केवारी आपोआप मोजली जाते.',
      ],
      submit: 'सर्व विद्यार्थ्यांना मार्क करून Save दाबा. त्याच तारखेला पुन्हा सेव्ह केल्यास जुनीच नोंद बदलते (डुप्लिकेट होत नाही).',
      tips: [
        '७५% पेक्षा कमी हजेरी असलेल्यांना आपोआप ईमेलने इशारा जातो.',
        'सलग तीन गैरहजेरी असल्यास विद्यार्थी अ‍ॅडमिन डॅशबोर्डवर ड्रॉप-आउट धोका म्हणून दिसतो.',
      ],
    },
  },

  '/examinations': {
    en: {
      title: 'Examinations',
      purpose: 'Schedule exams for a batch and issue hall tickets.',
      steps: ['See all scheduled exams.', 'Create an exam with a date, total marks and passing marks.'],
      submit: 'Click add, fill the exam title, batch, date and marks, then save.',
      tips: ['Results are entered from the Results page after the exam.'],
    },
    mr: {
      title: 'परीक्षा',
      purpose: 'बॅचसाठी परीक्षा ठरवा आणि हॉल तिकीट द्या.',
      steps: ['ठरलेल्या सर्व परीक्षा पहा.', 'तारीख, एकूण गुण आणि उत्तीर्ण गुण भरून परीक्षा तयार करा.'],
      submit: 'Add दाबा, परीक्षेचे नाव, बॅच, तारीख आणि गुण भरा, आणि सेव्ह करा.',
      tips: ['परीक्षेनंतर निकाल Results पेजवरून भरले जातात.'],
    },
  },

  '/results': {
    en: {
      title: 'Results',
      purpose: 'Enter marks and publish results.',
      steps: ['Pick the batch and exam.', 'Enter marks for each student — the grade is calculated automatically.'],
      submit: 'Enter the marks and click Save. The student is notified immediately.',
      tips: ['Marks cannot be more than the exam total.', 'Re-saving updates the mark; it does not create a duplicate.'],
    },
    mr: {
      title: 'निकाल',
      purpose: 'गुण भरा आणि निकाल जाहीर करा.',
      steps: ['बॅच आणि परीक्षा निवडा.', 'प्रत्येक विद्यार्थ्याचे गुण भरा — श्रेणी आपोआप मोजली जाते.'],
      submit: 'गुण भरून Save दाबा. विद्यार्थ्याला लगेच सूचना जाते.',
      tips: ['गुण परीक्षेच्या एकूण गुणांपेक्षा जास्त देता येत नाहीत.', 'पुन्हा सेव्ह केल्यास गुण बदलतात, डुप्लिकेट होत नाही.'],
    },
  },

  '/my-attendance': {
    en: {
      title: 'My Attendance',
      purpose: 'Mark yourself present in class, and see your overall attendance.',
      steps: [
        'Your overall attendance percentage is at the top — green above 85%, amber above 60%, red below.',
        'When your trainer opens check-in, a code box appears. Enter the 6-digit code they show on the class screen.',
        'That marks you present for today. If it already shows today, you are done.',
      ],
      submit:
        'Type the code and tap Check in. It only works while check-in is OPEN and only with your class’s real code — being in the room is the whole point.',
      tips: [
        'No code box means check-in is not open. Your trainer opens it during class.',
        'If your trainer marked you absent, the code will not override it — talk to them.',
      ],
    },
    mr: {
      title: 'माझी हजेरी',
      purpose: 'वर्गात स्वतःची उपस्थिती नोंदवा आणि एकूण हजेरी पहा.',
      steps: [
        'वर तुमची एकूण हजेरी टक्केवारी — ८५%च्या वर हिरवी, ६०%च्या वर पिवळी, खाली लाल.',
        'प्रशिक्षक चेक-इन उघडतो तेव्हा कोड बॉक्स दिसतो. वर्गाच्या स्क्रीनवरील ६ अंकी कोड टाका.',
        'यामुळे आजची उपस्थिती नोंदते. आज आधीच दिसत असेल तर झाले.',
      ],
      submit:
        'कोड टाका आणि चेक-इन दाबा. फक्त चेक-इन उघडे असताना आणि तुमच्या वर्गाच्या खऱ्या कोडनेच चालते.',
      tips: [
        'कोड बॉक्स नसेल तर चेक-इन उघडे नाही. प्रशिक्षक वर्गात उघडतो.',
        'प्रशिक्षकाने गैरहजर नोंदवले असेल तर कोड ते बदलणार नाही — त्यांच्याशी बोला.',
      ],
    },
  },

  '/feedback': {
    en: {
      title: 'Rate Your Trainer',
      purpose: 'Give anonymous feedback about your trainer.',
      steps: [
        'You see the trainers of the batches you are enrolled in.',
        'Click "Rate" next to a trainer.',
        'Give 1–5 stars on four things: Clarity of teaching, Punctuality, Lab support, Doubt resolution.',
        'Optionally write a comment.',
      ],
      submit: 'Rate all four areas, then click "Submit anonymously". You can submit once per trainer per cycle.',
      tips: [
        'Your feedback is COMPLETELY ANONYMOUS. Your trainer never sees who submitted it — only the admin sees the ratings.',
        'Be honest; this is how teaching quality improves.',
      ],
    },
    mr: {
      title: 'ट्रेनरला गुण द्या',
      purpose: 'तुमच्या ट्रेनरबद्दल अनामिक अभिप्राय द्या.',
      steps: [
        'तुम्ही ज्या बॅचमध्ये आहात त्यांचे ट्रेनर दिसतात.',
        'ट्रेनरच्या शेजारी "Rate" दाबा.',
        'चार गोष्टींवर १–५ तारे द्या: शिकवण्याची स्पष्टता, वेळेवर येणे, लॅब मदत, शंका निरसन.',
        'हवे असल्यास टिप्पणी लिहा.',
      ],
      submit: 'चारही गोष्टींना गुण द्या, मग "Submit anonymously" दाबा. प्रत्येक ट्रेनरला एका चक्रात एकदाच अभिप्राय देता येतो.',
      tips: [
        'तुमचा अभिप्राय पूर्णपणे अनामिक आहे. ट्रेनरला कधीच कळत नाही की कोणी दिला — फक्त अ‍ॅडमिनला गुण दिसतात.',
        'प्रामाणिक रहा; यामुळेच शिकवण्याची गुणवत्ता सुधारते.',
      ],
    },
  },

  '/certificates': {
    en: {
      title: 'Certificates',
      purpose: 'Issue course-completion certificates — but only to students who have actually earned them.',
      steps: [
        'The table lists every certificate issued, who approved it, and whether it is still valid.',
        'Click "Issue certificate" and pick a student. The four eligibility checks run immediately.',
        'Course completed · passed the final assessment · fees cleared (including any late fee) · attendance at or above the threshold.',
      ],
      submit:
        'If all four checks pass, click Issue. If any fail, the button stays blocked until you write an override reason — and that reason is printed permanently on the certificate\'s record, next to the checks that failed.',
      tips: [
        'A student cannot issue their own certificate. Issuing requires the certificates.issue permission.',
        'Issuing twice returns the same certificate number instead of minting a second one.',
        'Revoking requires a written reason and is permanent — the public verification page will report the certificate as invalid.',
      ],
    },
    mr: {
      title: 'प्रमाणपत्रे',
      purpose: 'कोर्स पूर्णत्वाचे प्रमाणपत्र द्या — पण ज्यांनी खरोखर मिळवले आहे त्यांनाच.',
      steps: [
        'तक्त्यात दिलेली सर्व प्रमाणपत्रे, कोणी मंजूर केली आणि ती वैध आहेत का ते दिसते.',
        '"प्रमाणपत्र द्या" दाबा आणि विद्यार्थी निवडा. चार पात्रता तपासण्या लगेच चालतात.',
        'कोर्स पूर्ण · अंतिम परीक्षा उत्तीर्ण · फी भरली (विलंब शुल्कासह) · पुरेशी उपस्थिती.',
      ],
      submit:
        'चारही तपासण्या पास झाल्यास "द्या" दाबा. एखादी अयशस्वी असल्यास, विशेष मंजुरीचे कारण लिहिल्याशिवाय बटण चालणार नाही — आणि ते कारण प्रमाणपत्राच्या नोंदीवर कायम राहते.',
      tips: [
        'विद्यार्थी स्वतःला प्रमाणपत्र देऊ शकत नाही. त्यासाठी certificates.issue परवानगी लागते.',
        'दोनदा दिल्यास तेच प्रमाणपत्र क्रमांक परत मिळतो, दुसरा तयार होत नाही.',
        'रद्द करण्यासाठी लेखी कारण लागते आणि ते कायमचे असते — सार्वजनिक पडताळणीत प्रमाणपत्र अवैध दिसेल.',
      ],
    },
  },



  '/library': {
    en: {
      title: 'Library',
      purpose: 'Books — search, add, issue and return.',
      steps: ['Search a book by title, author or ISBN.', 'Issue a book to a student, or mark it returned.'],
      submit: 'To add a book: fill title, author and number of copies, then save. To issue: pick the book and student, set a due date, then save.',
      tips: ['A book cannot be issued if no copies are available.'],
    },
    mr: {
      title: 'ग्रंथालय',
      purpose: 'पुस्तके — शोधा, जोडा, द्या आणि परत घ्या.',
      steps: ['नाव, लेखक किंवा ISBN ने पुस्तक शोधा.', 'विद्यार्थ्याला पुस्तक द्या, किंवा परत आल्याची नोंद करा.'],
      submit: 'पुस्तक जोडण्यासाठी: नाव, लेखक आणि प्रती भरून सेव्ह करा. देण्यासाठी: पुस्तक व विद्यार्थी निवडा, परत करण्याची तारीख भरा, सेव्ह करा.',
      tips: ['प्रती शिल्लक नसल्यास पुस्तक देता येत नाही.'],
    },
  },

  '/inventory': {
    en: {
      title: 'Inventory',
      purpose: 'Institute assets and stock — projectors, markers, equipment.',
      steps: ['See every item with its quantity and reorder level.', 'Items below the reorder level are flagged as low stock.'],
      submit: 'To add stock: choose the item, select "in" (received) or "out" (used), enter the quantity, and save.',
      tips: ['You cannot take out more stock than you have.'],
    },
    mr: {
      title: 'साठा',
      purpose: 'संस्थेच्या वस्तू आणि साठा — प्रोजेक्टर, मार्कर, उपकरणे.',
      steps: ['प्रत्येक वस्तू, तिचा साठा आणि किमान पातळी पहा.', 'किमान पातळीखालील वस्तू "कमी साठा" म्हणून दाखवल्या जातात.'],
      submit: 'साठा बदलण्यासाठी: वस्तू निवडा, "in" (आले) किंवा "out" (वापरले) निवडा, संख्या भरा, आणि सेव्ह करा.',
      tips: ['शिल्लक नसताना साठा काढता येत नाही.'],
    },
  },

  '/reports': {
    en: {
      title: 'Reports',
      purpose: 'Revenue, enrollment trends and data exports.',
      steps: ['View revenue by month and enrollment by course.', 'Export students, courses or fees as a CSV file.'],
      tips: ['Exports open in Excel.'],
    },
    mr: {
      title: 'अहवाल',
      purpose: 'उत्पन्न, प्रवेशाचा कल आणि डेटा एक्सपोर्ट.',
      steps: ['महिन्यानुसार उत्पन्न आणि कोर्सनुसार प्रवेश पहा.', 'विद्यार्थी, कोर्सेस किंवा फी CSV मध्ये एक्सपोर्ट करा.'],
      tips: ['एक्सपोर्ट केलेली फाइल Excel मध्ये उघडते.'],
    },
  },

  '/trainer-performance': {
    en: {
      title: 'Trainer Performance & Communications',
      purpose: 'Anonymous student ratings of each trainer, plus one-click email tools.',
      steps: [
        'Each trainer card shows their average star rating and a breakdown: Clarity, Punctuality, Lab support, Doubt resolution.',
        'A red "Needs attention" badge means the rating dropped below 3.5.',
        'Click "Read comments" to see anonymous written feedback.',
        'EMAIL TRIGGERS (top): one click sends fee reminders, attendance warnings or low-feedback alerts to everyone who needs one.',
      ],
      submit: 'Click "Broadcast" to email all students: fill the subject and message, choose the audience (active / alumni / everyone), then click "Send broadcast".',
      tips: [
        'Trainers CANNOT see this page — ratings bypass them completely.',
        'Re-running a trigger the same day will not spam anyone twice.',
      ],
    },
    mr: {
      title: 'ट्रेनर कामगिरी आणि संदेश',
      purpose: 'प्रत्येक ट्रेनरचे अनामिक विद्यार्थी गुण, आणि एका क्लिकवर ईमेल साधने.',
      steps: [
        'प्रत्येक ट्रेनरच्या कार्डवर सरासरी तारे आणि तपशील दिसतो: स्पष्टता, वेळ, लॅब मदत, शंका निरसन.',
        'लाल "Needs attention" म्हणजे गुण ३.५ खाली गेले आहेत.',
        'अनामिक टिप्पण्या पाहण्यासाठी "Read comments" दाबा.',
        'ईमेल ट्रिगर्स (वरती): एका क्लिकवर फी स्मरणपत्र, हजेरी इशारा किंवा कमी-अभिप्राय सूचना पाठवा.',
      ],
      submit: 'सर्व विद्यार्थ्यांना ईमेल करण्यासाठी "Broadcast" दाबा: विषय व संदेश भरा, कोणाला पाठवायचे ते निवडा (active / alumni / सर्व), आणि "Send broadcast" दाबा.',
      tips: [
        'ट्रेनर्सना हे पेज दिसत नाही — गुण थेट अ‍ॅडमिनकडे येतात.',
        'एकाच दिवशी पुन्हा ट्रिगर चालवला तरी कोणालाही दोनदा ईमेल जात नाही.',
      ],
    },
  },

  '/settings': {
    en: {
      title: 'Settings',
      purpose: 'How the portal behaves on this device, and the way into Global Settings and the masters.',
      steps: [
        'APPEARANCE: choose Light or Dark, a brand colour and a page background. "Open the Switcher" has every layout option; "Reset" restores the shipped look.',
        'LANGUAGE & TYPING: pick English, Marathi or Hindi. Turn CapsLock on to force names and codes into UPPERCASE as they are typed.',
        'INSTITUTE LETTERHEAD: a summary of the institute details. Press "Open Global Settings" to change them, the scheduling policy or the document numbering.',
        'MASTERS: shortcuts to courses, batches, rooms, trainers, staff, library, inventory, partners, users and roles.',
        'DATA & BACKUPS: the last five backups. "Back up now" takes another.',
      ],
      submit: 'Appearance, language and CapsLock save the moment you change them. There is no Save button, and they apply to this browser only. Global Settings has a Save button on every card.',
      tips: [
        'CapsLock never touches passwords, emails, numbers, dates or the sign-in screens.',
        'Operating hours, the trainer daily limit and document numbering are on Global Settings.',
      ],
    },
    mr: {
      title: 'संस्था सेटिंग्ज',
      purpose: 'संस्थेची माहिती आणि वेळापत्रक नियम.',
      steps: [
        'संस्थेचे नाव, पत्ता, फोन आणि शैक्षणिक वर्ष भरा.',
        'कामाच्या वेळा ठरवा — या वेळेबाहेरच्या बॅचेस नाकारल्या जातात.',
        'एका ट्रेनरला दिवसाला जास्तीत जास्त किती बॅचेस — यापेक्षा जास्त नेमणूक सिस्टीम अडवते.',
      ],
      submit: 'मूल्ये बदलून Save दाबा. नवीन नियम लगेच सर्व नवीन बॅचेसना लागू होतात.',
      tips: ['मर्यादा कमी केल्याने आधीच्या बॅचेस जात नाहीत; फक्त नवीन अडवल्या जातात.'],
    },
  },

  '/users': {
    en: {
      title: 'User Management',
      purpose: 'This is where every other person in the system comes from — trainers, the placement team, front-desk staff and students.',
      steps: [
        'Add user → fill in name, email, a starting password, and choose the ROLE. The role decides what they can see and do.',
        'Creating a TRAINER also creates their trainer profile; creating a STUDENT also creates their student record. Without that second half they could sign in and then be refused by every page — so the system does both.',
        'Permissions shows exactly what an account can do. Those come from the ROLE, not the person.',
        'Sign-in can be switched off without deleting the account.',
      ],
      submit:
        'Save. The account works immediately — the password is NOT emailed, so hand it over yourself and ask them to change it.',
      tips: [
        'Prefer disabling sign-in over deleting. Deleting removes the login; disabling keeps their history (marks they entered, fees they collected) attached to a real name.',
        'You cannot delete your own account, disable your own sign-in, or remove the last super admin — any of those would lock everyone out.',
        'An email can only be used once. A second account with the same email is refused.',
      ],
    },
    mr: {
      title: 'वापरकर्ता व्यवस्थापन',
      purpose: 'प्रणालीतील इतर प्रत्येक व्यक्ती इथून तयार होते — प्रशिक्षक, प्लेसमेंट टीम, कार्यालयीन कर्मचारी आणि विद्यार्थी.',
      steps: [
        'वापरकर्ता जोडा → नाव, ईमेल, सुरुवातीचा पासवर्ड भरा आणि भूमिका निवडा. भूमिका ठरवते त्यांना काय दिसेल आणि काय करता येईल.',
        'प्रशिक्षक तयार केल्यास त्यांचे प्रशिक्षक प्रोफाइलही तयार होते; विद्यार्थी तयार केल्यास विद्यार्थी नोंदही होते. हा दुसरा भाग नसेल तर ते लॉगिन करू शकतील पण प्रत्येक पानावर नाकारले जातील — म्हणून प्रणाली दोन्ही करते.',
        '"परवानग्या" मध्ये खाते नेमके काय करू शकते ते दिसते. या भूमिकेवरून येतात, व्यक्तीवरून नाही.',
        'खाते न हटवता लॉगिन बंद करता येते.',
      ],
      submit:
        'जतन करा. खाते लगेच चालू होते — पासवर्ड ईमेल केला जात नाही, तो तुम्हीच द्या आणि बदलायला सांगा.',
      tips: [
        'हटवण्यापेक्षा लॉगिन बंद करणे चांगले. हटवल्यास लॉगिन जाते; बंद केल्यास त्यांचा इतिहास (त्यांनी नोंदवलेले गुण, जमा केलेली फी) खऱ्या नावाशी जोडलेला राहतो.',
        'स्वतःचे खाते हटवता येत नाही, स्वतःचे लॉगिन बंद करता येत नाही, आणि शेवटचा सुपर अ‍ॅडमिन काढता येत नाही — यापैकी काहीही केल्यास सर्वजण बाहेर लॉक होतील.',
        'एक ईमेल एकदाच वापरता येतो. त्याच ईमेलचे दुसरे खाते नाकारले जाते.',
      ],
    },
  },

  '/roles': {
    en: {
      title: 'Roles & Permissions',
      purpose: 'Control exactly what each role can see and do.',
      steps: [
        'Pick a role (Admin, Trainer, Staff, Student, Placement).',
        'Tick or untick each permission — for example, trainers cannot see fees or revenue.',
      ],
      submit: 'Tick the permissions you want and click Save. Changes apply the next time that user loads a page.',
      tips: [
        'Permissions are enforced on the server, not just hidden in the menu — a blocked user gets "403 Forbidden" even if they type the URL.',
        'System roles cannot be deleted.',
      ],
    },
    mr: {
      title: 'भूमिका आणि परवानग्या',
      purpose: 'प्रत्येक भूमिकेला काय दिसेल आणि काय करता येईल ते ठरवा.',
      steps: [
        'भूमिका निवडा (Admin, Trainer, Staff, Student, Placement).',
        'प्रत्येक परवानगी टिक करा/काढा — उदा. ट्रेनरला फी किंवा उत्पन्न दिसत नाही.',
      ],
      submit: 'हव्या त्या परवानग्या टिक करून Save दाबा. वापरकर्त्याने पुढच्या वेळी पेज उघडल्यावर बदल लागू होतात.',
      tips: [
        'परवानग्या सर्व्हरवर तपासल्या जातात, फक्त मेनूमधून लपवल्या जात नाहीत — URL टाकला तरी "403 Forbidden" मिळते.',
        'सिस्टीम भूमिका डिलीट करता येत नाहीत.',
      ],
    },
  },

  '/profile': {
    en: {
      title: 'My Profile',
      purpose: 'Your own account details.',
      steps: ['See your name, email and role.', 'Update your details.'],
      submit: 'Change the fields and click Save.',
      tips: ['To change your password, use "Forgot password?" on the login page.'],
    },
    mr: {
      title: 'माझे प्रोफाइल',
      purpose: 'तुमच्या स्वतःच्या खात्याची माहिती.',
      steps: ['तुमचे नाव, ईमेल आणि भूमिका पहा.', 'माहिती अपडेट करा.'],
      submit: 'माहिती बदलून Save दाबा.',
      tips: ['पासवर्ड बदलण्यासाठी लॉगिन पेजवरील "Forgot password?" वापरा.'],
    },
  },

  '/placements': {
    en: {
      title: 'Placements',
      purpose: 'Run the institute like an internal recruitment agency: match Job-Ready students to real openings, run the interview rounds, and feed what goes wrong back to the trainer.',
      steps: [
        'JOBS — post a JD. The skills you tag are a HARD filter, and the attendance/score bars are enforced by the server.',
        'FIND CANDIDATES — the system splits students into ELIGIBLE (meets every requirement) and NEAR MISSES (blocked, with the exact reason).',
        'PIPELINE — shortlisted → internal screening → client rounds → offered → placed. Stages cannot be skipped.',
        'SKILL GAPS — every skill a company has rejected our students for, counted.',
      ],
      submit:
        'Shortlist an eligible candidate with one click. To put forward someone who does NOT meet the bar you must write a justification — it is recorded on the application.',
      tips: [
        'Only a trainer can make a student Job-Ready, and only by recording real scores and signing off soft skills. Placement cannot grant it.',
        'When you log a FAILED round, tag the skills that let the student down. Each tag raises a remedial task on that student’s trainer and pulls the student out of the Job-Ready pool.',
        'If the same skill shows up across many students, that is a curriculum problem — look at the Skill gaps tab.',
      ],
    },
    mr: {
      title: 'प्लेसमेंट',
      purpose: 'संस्थेला अंतर्गत भरती एजन्सीसारखे चालवा: तयार विद्यार्थ्यांना खऱ्या जागांशी जोडा, मुलाखतीच्या फेऱ्या चालवा, आणि जे चुकते ते प्रशिक्षकाकडे परत पाठवा.',
      steps: [
        'नोकऱ्या — नोकरीचे वर्णन टाका. निवडलेली कौशल्ये कडक चाळणी असतात; उपस्थिती व गुणांची पातळी सर्व्हर तपासतो.',
        'उमेदवार शोधा — प्रणाली विद्यार्थ्यांना पात्र (सर्व अटी पूर्ण) आणि थोडक्यात हुकलेले (नेमक्या कारणासह अडलेले) असे वेगळे करते.',
        'प्रक्रिया — निवड यादी → अंतर्गत चाळणी → क्लायंट फेऱ्या → ऑफर → नियुक्ती. टप्पे वगळता येत नाहीत.',
        'कौशल्य त्रुटी — ज्या कौशल्यांमुळे कंपन्यांनी नाकारले त्यांची मोजणी.',
      ],
      submit:
        'पात्र उमेदवाराला एका क्लिकवर निवड यादीत टाका. पात्र नसलेल्याला पुढे करायचे असल्यास कारण लिहावे लागते — ते अर्जावर नोंदवले जाते.',
      tips: [
        'विद्यार्थ्याला "तयार" फक्त प्रशिक्षकच करू शकतो — खरे गुण नोंदवून आणि सॉफ्ट स्किल्सला मंजुरी देऊन. प्लेसमेंट टीम हे देऊ शकत नाही.',
        'अनुत्तीर्ण फेरी नोंदवताना ज्या कौशल्यांत कमी पडले ते टॅग करा. प्रत्येक टॅगमुळे प्रशिक्षकाकडे उपचारात्मक काम जाते आणि विद्यार्थी तयार यादीतून बाहेर पडतो.',
        'तीच त्रुटी अनेक विद्यार्थ्यांत दिसली तर ती अभ्यासक्रमाची अडचण आहे — कौशल्य त्रुटी टॅब पहा.',
      ],
    },
  },

  '/readiness': {
    en: {
      title: 'Student Readiness (Trainer)',
      purpose: 'Decide who is ready for the job market — and pick up what the market sent back.',
      steps: [
        'Pick a batch. Each student shows attendance, weighted technical score, and whether you have signed off their soft skills.',
        'EVALUATE — record a mock test, code review, lab exam, mock interview or project. Weight matters: a final lab exam should outweigh a pop quiz.',
        'Verifying a skill while grading is what makes it visible to recruiters — a student’s own claim is not enough.',
        'SIGN OFF soft skills when the student is genuinely presentable.',
        'REMEDIAL TASKS — what interview rejections sent back to you, with the interviewer’s own words.',
      ],
      submit:
        'You cannot mark anyone Job-Ready. It is DERIVED: attendance ≥ 85%, weighted technical ≥ 75%, and your soft-skill sign-off. All three, or they are not ready.',
      tips: [
        'Withdrawing your sign-off removes the student from the placement pool immediately.',
        'Marking a remedial task done re-checks the student — if they now clear the bar, they go straight back into the pool.',
        'Two out of three is not "nearly ready". A recruiter’s minimum is not a rounding target.',
      ],
    },
    mr: {
      title: 'विद्यार्थी तयारी (प्रशिक्षक)',
      purpose: 'कोण नोकरीसाठी तयार आहे ते ठरवा — आणि बाजाराने काय परत पाठवले ते उचला.',
      steps: [
        'बॅच निवडा. प्रत्येक विद्यार्थ्याची उपस्थिती, भारित तांत्रिक गुण, आणि सॉफ्ट स्किल मंजुरी दिसते.',
        'मूल्यांकन — सराव चाचणी, कोड पुनरावलोकन, लॅब परीक्षा, सराव मुलाखत किंवा प्रकल्प नोंदवा. वजन महत्त्वाचे: अंतिम लॅब परीक्षा छोट्या चाचणीपेक्षा जास्त मोजली जावी.',
        'मूल्यांकनासोबत कौशल्य पडताळल्यासच ते भरतीकर्त्यांना दिसते — विद्यार्थ्याचा स्वतःचा दावा पुरेसा नाही.',
        'विद्यार्थी खरोखर सादर करण्यायोग्य असेल तेव्हाच सॉफ्ट स्किल्सला मंजुरी द्या.',
        'उपचारात्मक कामे — मुलाखतीच्या नकारांनी तुमच्याकडे काय परत पाठवले, मुलाखतकाराच्या शब्दांसह.',
      ],
      submit:
        'तुम्ही कोणालाही "तयार" म्हणून खूण करू शकत नाही. ते आपोआप ठरते: उपस्थिती ≥ ८५%, भारित तांत्रिक ≥ ७५%, आणि तुमची सॉफ्ट स्किल मंजुरी. तिन्ही हवेत.',
      tips: [
        'मंजुरी मागे घेतल्यास विद्यार्थी लगेच प्लेसमेंट यादीतून बाहेर जातो.',
        'उपचारात्मक काम पूर्ण केल्यावर विद्यार्थी पुन्हा तपासला जातो — पातळी गाठल्यास तो लगेच यादीत परत येतो.',
        'तीनपैकी दोन म्हणजे "जवळपास तयार" नाही. भरतीकर्त्याची किमान अट गोलाकार करण्यासाठी नसते.',
      ],
    },
  },

  '/portfolio': {
    en: {
      title: 'My Portfolio (Student)',
      purpose: 'Your evidence of capability — and an honest mirror of why you are, or are not, being put forward for jobs.',
      steps: [
        'The top panel shows the three conditions the placement team checks. Nothing is hidden from you.',
        'Upload your resume. A TEXT-BASED PDF is indexed for keyword matching; a scanned image cannot be searched and the page will tell you so.',
        'Add your GitHub, live projects and LinkedIn.',
        'Claim the skills you have.',
      ],
      submit:
        'Save. Your profile is what the placement team sees when they run a search for a real opening.',
      tips: [
        'A skill you add yourself is only a CLAIM. Recruiters are shown trainer-verified skills — ask your trainer to assess you.',
        'Attendance below 85% or a technical score below 75% will keep you out of the pool, however good your portfolio is.',
      ],
    },
    mr: {
      title: 'माझे पोर्टफोलिओ (विद्यार्थी)',
      purpose: 'तुमच्या क्षमतेचा पुरावा — आणि तुम्हाला नोकरीसाठी का पुढे केले जाते किंवा का नाही याचा प्रामाणिक आरसा.',
      steps: [
        'वरच्या भागात प्लेसमेंट टीम तपासत असलेल्या तीन अटी दिसतात. तुमच्यापासून काहीही लपवलेले नाही.',
        'रेझ्युमे अपलोड करा. मजकूर असलेली पीडीएफ कीवर्डसाठी नोंदवली जाते; स्कॅन केलेली प्रतिमा शोधता येत नाही — पान तुम्हाला तसे सांगेल.',
        'गिटहब, सुरू असलेले प्रकल्प आणि लिंक्डइन जोडा.',
        'तुमच्याकडे असलेली कौशल्ये जोडा.',
      ],
      submit:
        'जतन करा. खऱ्या जागेसाठी शोध घेताना प्लेसमेंट टीमला हेच प्रोफाइल दिसते.',
      tips: [
        'स्वतः जोडलेले कौशल्य म्हणजे फक्त दावा. भरतीकर्त्यांना प्रशिक्षकाने पडताळलेली कौशल्येच दिसतात — प्रशिक्षकाकडून मूल्यांकन करून घ्या.',
        'उपस्थिती ८५% पेक्षा कमी किंवा तांत्रिक गुण ७५% पेक्षा कमी असल्यास पोर्टफोलिओ कितीही चांगला असो, तुम्ही यादीत येणार नाही.',
      ],
    },
  },

};

/**
 * Fold Hindi into every route. A route with no Hindi entry keeps `en`/`mr` and
 * the component falls back to English — it can never render blank.
 */
export const pageHelp = Object.fromEntries(
  Object.entries(pageHelpEnMr).map(([route, entry]) => [
    route,
    pageHelpHi[route] ? { ...entry, hi: pageHelpHi[route] } : entry,
  ])
);

/**
 * Resolve help for a live pathname.
 *
 * 1. Exact match.
 * 2. Numeric segments are normalised to `:id`, so `/students/5/edit` finds the
 *    `/students/:id/edit` entry — an edit FORM must get form help, not the
 *    list's help.
 * 3. Otherwise fall back to the longest matching prefix.
 */
export function helpFor(pathname) {
  if (pageHelp[pathname]) return pageHelp[pathname];

  const normalised = pathname.replace(/\/\d+(?=\/|$)/g, '/:id');
  if (pageHelp[normalised]) return pageHelp[normalised];

  const match = Object.keys(pageHelp)
    .filter((k) => pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match ? pageHelp[match] : null;
}

export default pageHelp;
