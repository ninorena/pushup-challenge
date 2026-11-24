// Heights in feet for the climb. Each one was read from the page at `source` on 2026-11-24.
// The comment on each line says how the page states it. Add a height only with a source.
// `name` must read correctly after "higher than".

// The landmark for a week: the tallest one that is not taller than the feet of the week.
export const landmarks = [
  { name: "Michelangelo's David", feet: 17, source: "https://en.wikipedia.org/wiki/David_(Michelangelo)" }, // converted from 5.17 m; page shows 5.17 metres (17 ft 0 in); statue height
  { name: "a tall giraffe", feet: 19, source: "https://en.wikipedia.org/wiki/Giraffe" }, // converted from 5.7 m; page shows 4.3–5.7 m (14–19 ft); top of the adult range; adults start at 14 ft
  { name: "the Bean in Chicago", feet: 33, source: "https://en.wikipedia.org/wiki/Cloud_Gate" }, // converted from 10 m; page shows 10 m × 13 m × 20 m (33 ft × 42 ft × 66 ft); height is the first dimension
  { name: "the letters of the Hollywood Sign", feet: 45, source: "https://en.wikipedia.org/wiki/Hollywood_Sign" }, // stated in feet; page shows 45 ft (13.7 m) tall; letter height; one sentence in the body says 44 ft
  { name: "a head on Mount Rushmore", feet: 60, source: "https://en.wikipedia.org/wiki/Mount_Rushmore" }, // stated in feet; page shows 60-foot-tall (18 m); height of the carved heads, not the mountain
  { name: "the Great Sphinx of Giza", feet: 66, source: "https://en.wikipedia.org/wiki/Great_Sphinx_of_Giza" }, // converted from 20 m; page shows 20 metres (66 ft)
  { name: "the Trevi Fountain", feet: 86, source: "https://en.wikipedia.org/wiki/Trevi_Fountain" }, // converted from 26.3 m; page shows 26.3 metres (86 ft)
  { name: "the Christ the Redeemer statue", feet: 98, source: "https://en.wikipedia.org/wiki/Christ_the_Redeemer_(statue)" }, // converted from 30 m; page shows 30 metres (98 ft); 125 ft with pedestal
  { name: "the Arc de Triomphe", feet: 163, source: "https://en.wikipedia.org/wiki/Arc_de_Triomphe" }, // converted from 49.54 m; page shows 49.54 m (162.5 ft); 162.5 ft rounded up
  { name: "the Horseshoe Falls at Niagara", feet: 167, source: "https://en.wikipedia.org/wiki/Horseshoe_Falls" }, // stated in feet; page shows 167 ft (51 m); total height of Horseshoe Falls
  { name: "the Leaning Tower of Pisa", feet: 183, source: "https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa" }, // converted from 55.86 m; page shows 55.86 m (183 ft 3 in); maximum height
  { name: "the Taj Mahal", feet: 240, source: "https://en.wikipedia.org/wiki/Taj_Mahal" }, // converted from 73 m; page shows 73 m (240 ft)
  { name: "the General Sherman Tree", feet: 275, source: "https://en.wikipedia.org/wiki/General_Sherman_Tree" }, // converted from 83.8 m; page shows 83.8 m (275 ft)
  { name: "the Statue of Liberty, from the ground to the torch", feet: 305, source: "https://en.wikipedia.org/wiki/Statue_of_Liberty" }, // stated in feet; page shows 305 feet 1 inch (93 meters); copper statue alone is 151 ft
  { name: "Big Ben", feet: 316, source: "https://en.wikipedia.org/wiki/Big_Ben" }, // stated in feet; page shows 316 feet (96 m)
  { name: "the Great Pyramid of Giza", feet: 454, source: "https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza" }, // converted from 138.5 m; page shows 138.5 m (454 ft); original height was 481 ft
  { name: "the Washington Monument", feet: 555, source: "https://en.wikipedia.org/wiki/Washington_Monument" }, // stated in feet; page shows 555 ft (169 m)
  { name: "the Space Needle", feet: 605, source: "https://en.wikipedia.org/wiki/Space_Needle" }, // stated in feet; page shows 605.00 ft (184.404 m); antenna spire height
  { name: "the Gateway Arch", feet: 630, source: "https://en.wikipedia.org/wiki/Gateway_Arch" }, // stated in feet; page shows 630 ft (192 m)
  { name: "the towers of the Golden Gate Bridge", feet: 746, source: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge" }, // stated in feet; page shows 746 ft (227.4 m)
  { name: "the Eiffel Tower", feet: 1083, source: "https://en.wikipedia.org/wiki/Eiffel_Tower" }, // converted from 330 m; page shows 330 m (1,083 ft); architectural height is 984 ft
  { name: "the Empire State Building", feet: 1454, source: "https://en.wikipedia.org/wiki/Empire_State_Building" }, // stated in feet; page shows 1,454 ft (443.2 m); roof is 1,250 ft
  { name: "One World Trade Center", feet: 1776, source: "https://en.wikipedia.org/wiki/One_World_Trade_Center" }, // stated in feet; page shows 1,776 ft (541.3 m); tip is 1,792 ft
  { name: "the Shanghai Tower", feet: 2073, source: "https://en.wikipedia.org/wiki/Shanghai_Tower" }, // converted from 632 m; page shows 632 m (2,073 ft); architectural height and tip are the same
  { name: "Yosemite Falls", feet: 2425, source: "https://en.wikipedia.org/wiki/Yosemite_Falls" }, // stated in feet; page shows 2,425 ft (739 m); three drops combined; longest single drop is 1,430 ft
  { name: "the Burj Khalifa", feet: 2722, source: "https://en.wikipedia.org/wiki/Burj_Khalifa" }, // converted from 829.8 m; page shows 829.8 m (2,722 ft); architectural height is 2,717 ft
  { name: "the face of El Capitan", feet: 3000, source: "https://en.wikipedia.org/wiki/El_Capitan" }, // stated in feet; page shows about 3,000 feet (914 m); the page says 'about'; not the summit elevation
  { name: "Angel Falls", feet: 3212, source: "https://en.wikipedia.org/wiki/Angel_Falls" }, // converted from 979 m; page shows 979 m (3,212 ft); longest single drop is 2,648 ft
];

// The mountain for a season: summit elevation above sea level.
export const mountains = [
  { name: "Arthur's Seat", feet: 823, source: "https://en.wikipedia.org/wiki/Arthur%27s_Seat" }, // converted from 251 m; page shows 251 m (823 ft)
  { name: "Rock of Gibraltar", feet: 1398, source: "https://en.wikipedia.org/wiki/Rock_of_Gibraltar" }, // converted from 426 m; page shows 426 m (1,398 ft)
  { name: "Scafell Pike", feet: 3209, source: "https://en.wikipedia.org/wiki/Scafell_Pike" }, // converted from 978 m; page shows 978 m (3,209 ft)
  { name: "Snowdon", feet: 3559, source: "https://en.wikipedia.org/wiki/Snowdon" }, // converted from 1084.74 m; page shows 1,084.74 m (3,558.9 ft)
  { name: "Mount Vesuvius", feet: 4203, source: "https://en.wikipedia.org/wiki/Mount_Vesuvius" }, // converted from 1281 m; page shows 1,281 m (4,203 ft)
  { name: "Ben Nevis", feet: 4413, source: "https://en.wikipedia.org/wiki/Ben_Nevis" }, // converted from 1345 m; page shows 1,345 m (4,413 ft)
  { name: "Mount Washington in New Hampshire", feet: 6288, source: "https://en.wikipedia.org/wiki/Mount_Washington" }, // stated in feet; page shows 6,288.3 ft (1,916.7 m)
  { name: "Mount Mitchell", feet: 6684, source: "https://en.wikipedia.org/wiki/Mount_Mitchell" }, // stated in feet; page shows 6,684 ft (2,037 m)
  { name: "Mount Kosciuszko", feet: 7310, source: "https://en.wikipedia.org/wiki/Mount_Kosciuszko" }, // converted from 2228 m; page shows 2,228 m (7,310 ft)
  { name: "Mount St. Helens", feet: 8363, source: "https://en.wikipedia.org/wiki/Mount_St._Helens" }, // stated in feet; page shows 8,363 ft (2,549 m); height after the 1980 eruption
  { name: "Mount Olympus in Greece", feet: 9573, source: "https://en.wikipedia.org/wiki/Mount_Olympus" }, // converted from 2917.727 m; page shows 2,917.727 m (9,572.60 ft)
  { name: "Mount Hood", feet: 11249, source: "https://en.wikipedia.org/wiki/Mount_Hood" }, // stated in feet; page shows 11,249 ft (3,429 m)
  { name: "Mount Fuji", feet: 12389, source: "https://en.wikipedia.org/wiki/Mount_Fuji" }, // converted from 3776.24 m; page shows 3,776.24 m (12,389 ft 3 in); from the article's first paragraph
  { name: "Mauna Kea", feet: 13803, source: "https://en.wikipedia.org/wiki/Mauna_Kea" }, // stated in feet; page shows 13,803 ft (4,207 m); above sea level
  { name: "Mount Rainier", feet: 14406, source: "https://en.wikipedia.org/wiki/Mount_Rainier" }, // stated in feet; page shows 14,406 feet (4,391 m); 2025 measurement; older sources say 14,410 or 14,411
  { name: "Matterhorn", feet: 14692, source: "https://en.wikipedia.org/wiki/Matterhorn" }, // converted from 4478 m; page shows 4,478 m (14,692 ft)
  { name: "Mont Blanc", feet: 15766, source: "https://en.wikipedia.org/wiki/Mont_Blanc" }, // converted from 4805.59 m; page shows 4,805.59 m (15,766.4 ft); ice cap height changes from survey to survey
  { name: "Mount Elbrus", feet: 18510, source: "https://en.wikipedia.org/wiki/Mount_Elbrus" }, // converted from 5642 m; page shows 5,642 m (18,510 ft)
  { name: "Mount Kilimanjaro", feet: 19341, source: "https://en.wikipedia.org/wiki/Mount_Kilimanjaro" }, // converted from 5895 m; page shows 5,895 m (19,341 ft)
  { name: "Denali", feet: 20310, source: "https://en.wikipedia.org/wiki/Denali" }, // stated in feet; page shows 20,310 ft (6,190 m)
  { name: "Aconcagua", feet: 22858, source: "https://en.wikipedia.org/wiki/Aconcagua" }, // converted from 6967.16 m; page shows 6,967.16 m (22,858.1 ft)
  { name: "Nanda Devi", feet: 25646, source: "https://en.wikipedia.org/wiki/Nanda_Devi" }, // converted from 7817 m; page shows 7,817 m (25,646 ft); added to fill the gap between Aconcagua and K2
  { name: "Annapurna", feet: 26545, source: "https://en.wikipedia.org/wiki/Annapurna" }, // converted from 8091 m; page shows 8,091 m (26,545 ft); added to fill the gap between Aconcagua and K2
  { name: "K2", feet: 28251, source: "https://en.wikipedia.org/wiki/K2" }, // converted from 8611 m; page shows 8,611 m (28,251 ft)
  { name: "Mount Everest", feet: 29032, source: "https://en.wikipedia.org/wiki/Mount_Everest" }, // converted from 8848.86 m; page shows 8,848.86 m (29,031.7 ft); 29,031.7 ft rounded up
];
