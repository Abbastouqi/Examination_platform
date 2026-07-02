"""Curated FPSC/NTS-style MCQ bank (original, exam-style — NOT copied from
copyrighted papers). Seeded into the `mcqs` collection by seed_questions.py and
used to build realistic category-wise mock tests without calling the LLM.

Each item: (category, question, {A,B,C,D}, answer, explanation, difficulty)
`test_types` marks which exams a category feeds (FPSC/NTS share most).
"""

# category -> list of question dicts
BANK: dict[str, list[dict]] = {
    "English": [
        {"q": "Choose the correct synonym of 'ephemeral'.", "o": {"A": "Everlasting", "B": "Short-lived", "C": "Colourful", "D": "Essential"}, "a": "B", "e": "'Ephemeral' means lasting for a very short time.", "d": "medium"},
        {"q": "Identify the antonym of 'benevolent'.", "o": {"A": "Kind", "B": "Generous", "C": "Malevolent", "D": "Gentle"}, "a": "C", "e": "'Malevolent' (wishing harm) is the opposite of 'benevolent' (kind).", "d": "medium"},
        {"q": "Fill in the blank: She is well versed ___ mathematics.", "o": {"A": "on", "B": "in", "C": "at", "D": "with"}, "a": "B", "e": "The idiom is 'well versed in' something.", "d": "easy"},
        {"q": "Choose the correctly spelled word.", "o": {"A": "Occurrence", "B": "Occurence", "C": "Ocurrence", "D": "Occurrance"}, "a": "A", "e": "'Occurrence' has double c, double r, and -ence.", "d": "medium"},
        {"q": "The idiom 'to bite the bullet' means:", "o": {"A": "To eat quickly", "B": "To endure a painful situation bravely", "C": "To start a fight", "D": "To waste resources"}, "a": "B", "e": "It means to face a difficult or unpleasant situation with courage.", "d": "medium"},
        {"q": "Choose the correct passive voice: 'They are building a bridge.'", "o": {"A": "A bridge is being built by them.", "B": "A bridge was built by them.", "C": "A bridge is built by them.", "D": "A bridge has been built by them."}, "a": "A", "e": "Present continuous passive = is/are being + past participle.", "d": "hard"},
    ],
    "General Knowledge": [
        {"q": "The headquarters of the United Nations is located in:", "o": {"A": "Geneva", "B": "New York", "C": "Paris", "D": "Vienna"}, "a": "B", "e": "The UN headquarters is in New York City, USA.", "d": "easy"},
        {"q": "Which is the longest river in the world?", "o": {"A": "Amazon", "B": "Nile", "C": "Yangtze", "D": "Indus"}, "a": "B", "e": "The Nile is generally regarded as the longest river (~6,650 km).", "d": "easy"},
        {"q": "The currency of Japan is the:", "o": {"A": "Won", "B": "Yuan", "C": "Yen", "D": "Ringgit"}, "a": "C", "e": "Japan's currency is the Yen.", "d": "easy"},
        {"q": "Which strait separates Asia from North America?", "o": {"A": "Strait of Hormuz", "B": "Bering Strait", "C": "Strait of Malacca", "D": "Bosphorus"}, "a": "B", "e": "The Bering Strait separates Russia (Asia) from Alaska (North America).", "d": "medium"},
        {"q": "The Great Barrier Reef is located off the coast of:", "o": {"A": "Brazil", "B": "South Africa", "C": "Australia", "D": "Indonesia"}, "a": "C", "e": "It lies off the coast of Queensland, Australia.", "d": "easy"},
        {"q": "Which organization awards the Nobel Peace Prize?", "o": {"A": "Swedish Academy", "B": "Norwegian Nobel Committee", "C": "UN General Assembly", "D": "Royal Society"}, "a": "B", "e": "The Norwegian Nobel Committee awards the Peace Prize.", "d": "medium"},
    ],
    "Pakistan Affairs": [
        {"q": "The Lahore Resolution was passed in:", "o": {"A": "1930", "B": "1940", "C": "1945", "D": "1947"}, "a": "B", "e": "The Lahore (Pakistan) Resolution was passed on 23 March 1940.", "d": "easy"},
        {"q": "Who was the first Governor-General of Pakistan?", "o": {"A": "Liaquat Ali Khan", "B": "Quaid-e-Azam Muhammad Ali Jinnah", "C": "Khawaja Nazimuddin", "D": "Ghulam Muhammad"}, "a": "B", "e": "Jinnah served as Pakistan's first Governor-General.", "d": "easy"},
        {"q": "The Indus Waters Treaty (1960) was signed between Pakistan and India with the mediation of:", "o": {"A": "United Nations", "B": "World Bank", "C": "USA", "D": "United Kingdom"}, "a": "B", "e": "The World Bank mediated and was a signatory to the Indus Waters Treaty.", "d": "medium"},
        {"q": "Pakistan's first constitution was promulgated in:", "o": {"A": "1947", "B": "1956", "C": "1962", "D": "1973"}, "a": "B", "e": "The first Constitution of Pakistan came into force on 23 March 1956.", "d": "medium"},
        {"q": "The Siachen Glacier dispute is between Pakistan and:", "o": {"A": "Afghanistan", "B": "China", "C": "India", "D": "Iran"}, "a": "C", "e": "Siachen is a militarised zone disputed between Pakistan and India.", "d": "medium"},
        {"q": "Which body has the power to interpret the Constitution of Pakistan?", "o": {"A": "The Parliament", "B": "The Supreme Court", "C": "The President", "D": "The Election Commission"}, "a": "B", "e": "The Supreme Court is the final interpreter of the Constitution.", "d": "hard"},
    ],
    "Current Affairs": [
        {"q": "Which body is the principal organ of the UN responsible for maintaining international peace and security?", "o": {"A": "General Assembly", "B": "Security Council", "C": "ECOSOC", "D": "Secretariat"}, "a": "B", "e": "The Security Council holds primary responsibility for peace and security.", "d": "easy"},
        {"q": "The Paris Agreement primarily concerns:", "o": {"A": "Nuclear disarmament", "B": "Climate change", "C": "Trade tariffs", "D": "Refugee rights"}, "a": "B", "e": "The 2015 Paris Agreement aims to limit global warming well below 2°C.", "d": "easy"},
        {"q": "CPEC is a flagship project under China's:", "o": {"A": "SCO", "B": "Belt and Road Initiative", "C": "BRICS", "D": "ASEAN"}, "a": "B", "e": "The China–Pakistan Economic Corridor is part of the Belt and Road Initiative.", "d": "easy"},
        {"q": "The Financial Action Task Force (FATF) deals with:", "o": {"A": "Climate finance", "B": "Money laundering and terror financing", "C": "Trade disputes", "D": "Currency exchange rates"}, "a": "B", "e": "FATF sets standards to combat money laundering and terrorist financing.", "d": "medium"},
        {"q": "SCO (Shanghai Cooperation Organisation) is primarily focused on:", "o": {"A": "Economic union only", "B": "Regional security and cooperation", "C": "Space exploration", "D": "Environmental law"}, "a": "B", "e": "The SCO focuses on political, security and economic cooperation in Eurasia.", "d": "medium"},
    ],
    "Islamic Studies": [
        {"q": "How many times is prayer (Salah) obligatory in a day for Muslims?", "o": {"A": "Three", "B": "Four", "C": "Five", "D": "Six"}, "a": "C", "e": "Five daily prayers are obligatory: Fajr, Zuhr, Asr, Maghrib, Isha.", "d": "easy"},
        {"q": "The first month of the Islamic (Hijri) calendar is:", "o": {"A": "Ramadan", "B": "Muharram", "C": "Rajab", "D": "Shawwal"}, "a": "B", "e": "Muharram is the first month of the Islamic lunar calendar.", "d": "easy"},
        {"q": "The migration of the Prophet (PBUH) from Makkah to Madinah is known as:", "o": {"A": "Hijrah", "B": "Isra", "C": "Miraj", "D": "Fatah"}, "a": "A", "e": "The Hijrah marks the start of the Islamic calendar.", "d": "easy"},
        {"q": "Zakat is generally levied at what rate on eligible savings?", "o": {"A": "2.5%", "B": "5%", "C": "10%", "D": "20%"}, "a": "A", "e": "Zakat is 2.5% on qualifying wealth held for a lunar year.", "d": "medium"},
        {"q": "The Treaty of Hudaybiyyah was signed in which year (approx.)?", "o": {"A": "6 AH", "B": "2 AH", "C": "10 AH", "D": "8 AH"}, "a": "A", "e": "The Treaty of Hudaybiyyah was concluded in 6 AH (628 CE).", "d": "hard"},
    ],
    "Everyday Science": [
        {"q": "The chemical symbol for gold is:", "o": {"A": "Go", "B": "Gd", "C": "Au", "D": "Ag"}, "a": "C", "e": "Gold's symbol is Au (from Latin 'aurum'). Ag is silver.", "d": "easy"},
        {"q": "Which vitamin is produced when human skin is exposed to sunlight?", "o": {"A": "Vitamin A", "B": "Vitamin C", "C": "Vitamin D", "D": "Vitamin K"}, "a": "C", "e": "UVB triggers vitamin D synthesis in the skin.", "d": "easy"},
        {"q": "The powerhouse of the cell is the:", "o": {"A": "Nucleus", "B": "Ribosome", "C": "Mitochondrion", "D": "Golgi body"}, "a": "C", "e": "Mitochondria produce ATP, the cell's energy currency.", "d": "easy"},
        {"q": "Sound cannot travel through:", "o": {"A": "Solids", "B": "Liquids", "C": "Gases", "D": "Vacuum"}, "a": "D", "e": "Sound needs a medium; it cannot propagate through a vacuum.", "d": "medium"},
        {"q": "The unit of electric resistance is the:", "o": {"A": "Volt", "B": "Ampere", "C": "Ohm", "D": "Watt"}, "a": "C", "e": "Resistance is measured in ohms (Ω).", "d": "medium"},
    ],
    "Mathematics": [
        {"q": "If 3x + 7 = 22, then x = ?", "o": {"A": "3", "B": "5", "C": "7", "D": "15"}, "a": "B", "e": "3x = 15, so x = 5.", "d": "easy"},
        {"q": "What is 15% of 240?", "o": {"A": "24", "B": "30", "C": "36", "D": "40"}, "a": "C", "e": "0.15 × 240 = 36.", "d": "easy"},
        {"q": "The average of 10, 20, 30, 40 and 50 is:", "o": {"A": "25", "B": "30", "C": "35", "D": "40"}, "a": "B", "e": "Sum 150 ÷ 5 = 30.", "d": "easy"},
        {"q": "A train travels 180 km in 3 hours. Its average speed is:", "o": {"A": "45 km/h", "B": "50 km/h", "C": "60 km/h", "D": "90 km/h"}, "a": "C", "e": "180 ÷ 3 = 60 km/h.", "d": "medium"},
        {"q": "If the ratio of two numbers is 3:5 and their sum is 40, the larger number is:", "o": {"A": "15", "B": "20", "C": "25", "D": "30"}, "a": "C", "e": "Parts = 8; each part = 5; larger = 5×5 = 25.", "d": "medium"},
    ],
    "Computer Science": [
        {"q": "What does 'CPU' stand for?", "o": {"A": "Central Process Unit", "B": "Central Processing Unit", "C": "Computer Personal Unit", "D": "Central Peripheral Unit"}, "a": "B", "e": "CPU = Central Processing Unit.", "d": "easy"},
        {"q": "Which of the following is an example of an operating system?", "o": {"A": "Oracle", "B": "Linux", "C": "Python", "D": "HTTP"}, "a": "B", "e": "Linux is an operating system; the others are a DBMS, a language, and a protocol.", "d": "easy"},
        {"q": "1 kilobyte (KB) is equal to how many bytes (binary)?", "o": {"A": "1000", "B": "1024", "C": "512", "D": "2048"}, "a": "B", "e": "In binary terms, 1 KB = 2^10 = 1024 bytes.", "d": "medium"},
        {"q": "HTML is used primarily to:", "o": {"A": "Style web pages", "B": "Structure web page content", "C": "Query databases", "D": "Compile programs"}, "a": "B", "e": "HTML provides the structure/markup of web pages; CSS styles them.", "d": "easy"},
        {"q": "Which data structure uses FIFO (First In, First Out)?", "o": {"A": "Stack", "B": "Queue", "C": "Tree", "D": "Graph"}, "a": "B", "e": "A queue processes elements in first-in, first-out order.", "d": "medium"},
    ],
    "Analytical Reasoning": [
        {"q": "Find the next number: 2, 6, 12, 20, 30, ?", "o": {"A": "36", "B": "40", "C": "42", "D": "48"}, "a": "C", "e": "Differences increase by 2 (4,6,8,10,12); 30+12 = 42.", "d": "medium"},
        {"q": "If 'CAT' is coded as 3-1-20, then 'DOG' is coded as:", "o": {"A": "4-15-7", "B": "4-14-7", "C": "3-15-7", "D": "4-15-8"}, "a": "A", "e": "Letters map to positions: D=4, O=15, G=7.", "d": "medium"},
        {"q": "All roses are flowers. Some flowers fade quickly. Therefore:", "o": {"A": "All roses fade quickly", "B": "Some roses may fade quickly", "C": "No roses fade quickly", "D": "All flowers are roses"}, "a": "B", "e": "Only a possibility can be inferred, not a certainty.", "d": "hard"},
        {"q": "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?", "o": {"A": "Sister", "B": "Mother", "C": "Aunt", "D": "Grandmother"}, "a": "B", "e": "The only daughter of the woman's mother is the woman herself, so she is his mother.", "d": "hard"},
        {"q": "Which one does not belong: Circle, Square, Triangle, Cube?", "o": {"A": "Circle", "B": "Square", "C": "Triangle", "D": "Cube"}, "a": "D", "e": "A cube is 3-dimensional; the rest are 2-D shapes.", "d": "easy"},
    ],
    "Intelligence": [
        {"q": "Complete the series: A, C, F, J, ?", "o": {"A": "M", "B": "N", "C": "O", "D": "P"}, "a": "C", "e": "Gaps grow by +2,+3,+4,+5: J+5 = O.", "d": "medium"},
        {"q": "If TODAY is Wednesday, what day will it be after 45 days?", "o": {"A": "Friday", "B": "Saturday", "C": "Sunday", "D": "Monday"}, "a": "A", "e": "45 mod 7 = 3; Wednesday + 3 = Saturday. (Wed→Thu→Fri→Sat)", "d": "hard"},
        {"q": "Which number is the odd one out: 8, 27, 64, 100, 125?", "o": {"A": "27", "B": "64", "C": "100", "D": "125"}, "a": "C", "e": "8,27,64,125 are perfect cubes; 100 is not.", "d": "medium"},
        {"q": "Book is to Reading as Fork is to:", "o": {"A": "Kitchen", "B": "Eating", "C": "Spoon", "D": "Metal"}, "a": "B", "e": "A book is used for reading; a fork is used for eating.", "d": "easy"},
        {"q": "If 5 machines make 5 widgets in 5 minutes, how long for 100 machines to make 100 widgets?", "o": {"A": "5 minutes", "B": "20 minutes", "C": "100 minutes", "D": "1 minute"}, "a": "A", "e": "Each machine makes 1 widget in 5 minutes, so 100 machines make 100 in 5 minutes.", "d": "hard"},
    ],
}

# Which exams each category feeds.
CATEGORY_EXAMS: dict[str, list[str]] = {
    "English": ["FPSC", "NTS"],
    "General Knowledge": ["FPSC", "NTS"],
    "Pakistan Affairs": ["FPSC", "NTS"],
    "Current Affairs": ["FPSC", "NTS"],
    "Islamic Studies": ["FPSC", "NTS"],
    "Everyday Science": ["FPSC", "NTS"],
    "Mathematics": ["FPSC", "NTS"],
    "Computer Science": ["FPSC", "NTS"],
    "Analytical Reasoning": ["FPSC", "NTS"],
    "Intelligence": ["FPSC", "NTS"],
}
