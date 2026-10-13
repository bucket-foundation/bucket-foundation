# Backbone Coverage

The consolidated progressions corpus measured against CIP 2020 and SOC 2018. 373 of 457 four-digit CIP families in use hold a row, a program, a book or a resource. 96 of 98 SOC minor groups hold an occupation row or are reached from a program, a book or a resource through the CIP to SOC crosswalk.

## Method

`build/consolidate.py` writes a `cip` object on every row and an `onet_soc` object on every occupation row. `coverage.py` reads those codes and holds no label rules of its own. The label to code table is `field_map.tsv`, an editorial mapping; catalogue courses and programs carry the code their department or program title matched; resources carry the provider field guess. `mapping_verified` is true only where the source prints the code, which holds for the O*NET profile rows.

Rows counts frameworks, progression, assessments and courses. Verified counts the rows among them with `verified` true, or `page_fetched` true for courses and programs. Edges counts prerequisite edges whose dependent row sits in the family. A six-digit code rolls up to its four-digit family. A row mapped at two digits counts toward its series alone. In the SOC tables, programs, books and resources are those whose CIP code the NCES and BLS crosswalk joins to an occupation in the group, so one item can count toward several groups.

## Tables

| Table | Rows | Verified or page fetched | Share | CIP mapped | Two-digit | Four-digit | Six-digit | CIP code stated by source | SOC mapped | SOC code stated by source |
|---|---|---|---|---|---|---|---|---|---|---|
| frameworks | 970 | 581 | 59.9% | 709 | 27 | 419 | 263 | 0 | 233 |  |
| progression | 67,753 | 64,619 | 95.4% | 42,889 | 2,490 | 36,559 | 3,840 | 0 | 1,409 | 228 |
| assessments | 556 | 285 | 51.3% | 531 | 13 | 261 | 257 | 0 | 266 |  |
| courses | 25,908 | 25,908 | 100.0% | 25,404 |  |  | 25,404 | 0 |  |  |
| books | 2,462 | 2,081 | 84.5% | 2,323 | 55 | 1,614 | 654 | 0 |  |  |
| resources | 55,692 | 38,575 | 69.3% | 28,139 |  | 28,139 |  | 0 |  |  |
| programs | 1,058 | 843 | 79.7% | 812 |  |  | 812 | 0 |  |  |
| edges | 24,088 | 20,571 stated | 85.4% | | | | | | | |

690 edges point at a course code with no row and carry `external` true.

## CIP Series

Families counts four-digit groups in use. Series only counts items mapped at two digits.

| Code | Series | Families | Covered | Rows | Verified | Edges | Programs | Books | Resources | Series only |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Agricultural/Animal/Plant/Veterinary Science And Related Fields | 19 | 16 | 1,313 | 1,261 | 893 | 46 | 65 | 107 |  |
| 03 | Natural Resources And Conservation | 6 | 5 | 274 | 253 | 166 | 13 | 27 | 121 |  |
| 04 | Architecture And Related Services | 9 | 6 | 695 | 650 | 304 | 17 | 47 | 497 |  |
| 05 | Area, Ethnic, Cultural, Gender, And Group Studies | 3 | 2 | 927 | 920 | 188 | 11 | 13 | 72 | 20 |
| 09 | Communication, Journalism, And Related Programs | 6 | 4 | 766 | 720 | 548 | 24 | 28 | 384 |  |
| 10 | Communications Technologies/Technicians And Support Services | 4 | 2 | 34 | 20 | 25 |  | 8 | 3 |  |
| 11 | Computer And Information Sciences And Support Services | 11 | 9 | 2,490 | 2,219 | 1,765 | 27 | 71 | 4,763 |  |
| 12 | Culinary, Entertainment, And Personal Services | 5 | 5 | 75 | 23 | 24 |  | 10 | 24 | 10 |
| 13 | Education | 15 | 12 | 3,685 | 3,624 | 726 | 40 | 24 | 399 |  |
| 14 | Engineering | 41 | 39 | 2,494 | 2,454 | 2,944 | 94 | 19 | 2,929 |  |
| 15 | Engineering/Engineering-Related Technologies/Technicians | 19 | 18 | 238 | 228 | 246 |  | 2 | 61 |  |
| 16 | Foreign Languages, Literatures, And Linguistics | 19 | 16 | 4,172 | 4,024 | 770 | 35 | 128 | 805 | 2,471 |
| 19 | Family And Consumer Sciences/Human Sciences | 9 | 6 | 3,119 | 3,073 | 269 | 8 | 32 | 161 |  |
| 21 | Reserved | 0 | 0 |  |  |  |  |  |  |  |
| 22 | Legal Professions And Studies | 5 | 5 | 421 | 390 | 158 | 7 | 33 | 200 |  |
| 23 | English Language And Literature/Letters | 4 | 3 | 7,785 | 7,671 | 571 | 13 | 54 | 519 | 15 |
| 24 | Liberal Arts And Sciences, General Studies And Humanities | 1 | 1 | 194 | 162 | 28 | 8 | 6 | 786 |  |
| 25 | Library Science | 3 | 1 | 402 | 389 | 14 | 1 | 10 | 17 |  |
| 26 | Biological And Biomedical Sciences | 15 | 14 | 1,418 | 1,408 | 1,277 | 70 | 31 | 882 |  |
| 27 | Mathematics And Statistics | 5 | 4 | 4,947 | 4,691 | 2,486 | 18 | 333 | 2,883 |  |
| 28 | Military Science, Leadership And Operational Art | 7 | 7 | 175 | 153 | 122 |  | 14 |  | 42 |
| 29 | Military Technologies And Applied Sciences | 5 | 3 | 29 | 26 | 6 |  |  |  |  |
| 30 | Multi/Interdisciplinary Studies | 51 | 31 | 4,484 | 4,363 | 620 | 32 | 44 | 1,378 |  |
| 31 | Parks, Recreation, Leisure, Fitness, And Kinesiology | 5 | 3 | 2,217 | 2,194 | 154 | 24 | 60 | 24 | 2 |
| 32 | Basic Skills And Developmental/Remedial Education | 2 | 2 | 73 | 41 | 26 |  | 33 | 198 |  |
| 33 | Citizenship Activities | 1 | 1 | 32 | 13 | 3 |  | 6 | 4 |  |
| 34 | Health-Related Knowledge And Skills | 1 | 1 | 2,208 | 2,190 | 13 |  | 4 | 24 |  |
| 35 | Interpersonal And Social Skills | 1 | 1 | 380 | 373 |  |  |  | 1 |  |
| 36 | Leisure And Recreational Activities | 2 | 2 | 419 | 118 | 249 |  | 108 | 70 |  |
| 37 | Personal Awareness And Self-Improvement | 1 | 1 | 14 | 3 | 8 |  | 6 | 85 |  |
| 38 | Philosophy And Religious Studies | 4 | 2 | 585 | 540 | 94 | 11 | 25 | 2,309 |  |
| 39 | Theology And Religious Vocations | 8 | 8 | 64 | 28 | 35 |  | 25 | 3 |  |
| 40 | Physical Sciences | 9 | 7 | 1,065 | 1,041 | 1,295 | 38 | 95 | 1,727 |  |
| 41 | Science Technologies/Technicians | 5 | 1 | 3 | 3 | 1 |  |  |  |  |
| 42 | Psychology | 4 | 3 | 726 | 709 | 485 | 10 | 27 | 117 |  |
| 43 | Homeland Security, Law Enforcement, Firefighting And Related Protective Services | 5 | 4 | 94 | 47 | 32 | 1 | 19 | 31 | 11 |
| 44 | Public Administration And Social Service Professions | 6 | 5 | 338 | 309 | 246 | 5 | 22 | 20 | 1 |
| 45 | Social Sciences | 14 | 11 | 7,650 | 7,565 | 995 | 38 | 269 | 1,485 |  |
| 46 | Construction Trades | 7 | 6 | 233 | 39 | 169 |  | 21 | 6 |  |
| 47 | Mechanic And Repair Technologies/Technicians | 8 | 6 | 198 | 60 | 148 |  | 14 | 21 |  |
| 48 | Precision Production | 6 | 2 | 57 | 9 | 41 |  | 14 | 1 |  |
| 49 | Transportation And Materials Moving | 4 | 3 | 83 | 29 | 44 |  | 15 | 1 |  |
| 50 | Visual And Performing Arts | 11 | 9 | 7,447 | 7,125 | 1,679 | 88 | 273 | 861 |  |
| 51 | Health Professions And Related Programs | 31 | 30 | 2,692 | 2,406 | 1,769 | 68 | 162 | 601 | 6 |
| 52 | Business, Management, Marketing, And Related Support Services | 22 | 20 | 2,019 | 1,766 | 1,290 | 58 | 93 | 3,272 | 7 |
| 53 | High School/Secondary Diplomas And Certificates | 2 | 2 | 9 | 6 |  |  |  |  |  |
| 54 | History | 1 | 1 | 571 | 560 | 56 | 7 | 33 | 287 |  |
| 55 | Reserved | 0 | 0 |  |  |  |  |  |  |  |
| 60 | Health Professions Residency/Fellowship Programs | 6 | 5 | 38 | 27 | 22 |  |  |  |  |
| 61 | Medical Residency/Fellowship Programs | 29 | 28 | 181 | 136 | 182 |  |  |  |  |

## CIP Four-Digit Families

CIP programs counts six-digit codes in use under the family.

| Code | Family | CIP programs | Rows | Verified | Edges | Programs | Books | Resources |
|---|---|---|---|---|---|---|---|---|
| 01.00 | Agriculture, General | 1 | 43 | 30 | 11 | 7 | 25 | 75 |
| 01.01 | Agricultural Business and Management | 7 | 103 | 103 | 126 | 4 |  | 2 |
| 01.02 | Agricultural Mechanization | 5 | 1 |  |  |  |  |  |
| 01.03 | Agricultural Production Operations | 9 | 32 | 20 | 5 | 2 | 2 |  |
| 01.04 | Agricultural and Food Products Processing | 1 | 1 |  |  |  |  |  |
| 01.05 | Agricultural and Domestic Animal Services | 6 | 5 | 4 | 3 |  |  |  |
| 01.06 | Applied Horticulture and Horticultural Business Services | 10 | 18 | 9 | 8 |  | 6 |  |
| 01.07 | International Agriculture | 1 | 11 | 11 | 1 |  |  |  |
| 01.08 | Agricultural Public Services | 3 | 12 | 12 | 1 |  |  |  |
| 01.09 | Animal Sciences | 8 | 260 | 260 | 307 | 9 |  | 1 |
| 01.10 | Food Science and Technology | 6 | 95 | 95 | 107 | 8 |  | 14 |
| 01.11 | Plant Sciences | 7 | 196 | 194 | 114 | 11 | 1 | 3 |
| 01.12 | Soil Sciences | 4 | 120 | 120 | 118 | 2 |  | 6 |
| 01.13 | Agriculture/Veterinary Preparatory Programs | 2 |  |  |  |  |  |  |
| 01.80 | Veterinary Medicine | 1 | 179 | 167 | 50 | 2 | 31 | 6 |
| 01.81 | Veterinary Biomedical and Clinical Sciences | 12 | 236 | 236 | 42 | 1 |  |  |
| 01.82 | Veterinary Administrative Services | 5 |  |  |  |  |  |  |
| 01.83 | Veterinary/Animal Health Technologies/Technicians | 2 | 1 |  |  |  |  |  |
| 01.99 | Agricultural/Animal/Plant/Veterinary Science and Related Fields, Other | 1 |  |  |  |  |  |  |
| 03.01 | Natural Resources Conservation and Research | 4 | 229 | 213 | 122 | 9 | 19 | 118 |
| 03.02 | Environmental/Natural Resources Management and Policy | 9 | 1 |  |  |  |  |  |
| 03.03 | Fishing and Fisheries Sciences and Management | 1 | 1 |  |  |  |  |  |
| 03.05 | Forestry | 8 | 39 | 36 | 42 | 4 | 8 | 3 |
| 03.06 | Wildlife and Wildlands Science and Management | 1 | 4 | 4 | 2 |  |  |  |
| 03.99 | Natural Resources and Conservation, Other | 1 |  |  |  |  |  |  |
| 04.02 | Architecture | 4 | 260 | 231 | 179 | 3 | 41 | 317 |
| 04.03 | City/Urban, Community, and Regional Planning | 1 | 248 | 244 | 57 | 7 | 1 | 175 |
| 04.04 | Environmental Design | 4 |  |  |  |  |  | 3 |
| 04.05 | Interior Architecture | 1 |  |  |  |  |  |  |
| 04.06 | Landscape Architecture | 1 | 187 | 175 | 68 | 5 | 4 | 1 |
| 04.08 | Architectural History, Criticism, and Conservation | 4 |  |  |  | 2 | 1 |  |
| 04.09 | Architectural Sciences and Technology | 3 |  |  |  |  |  |  |
| 04.10 | Real Estate Development | 1 |  |  |  |  |  | 1 |
| 04.99 | Architecture and Related Services, Other | 1 |  |  |  |  |  |  |
| 05.01 | Area Studies | 37 | 334 | 334 | 37 | 6 |  | 13 |
| 05.02 | Ethnic, Cultural Minority, Gender, and Group Studies | 12 | 586 | 586 | 145 | 5 |  | 59 |
| 05.99 | Area, Ethnic, Cultural, Gender, and Group Studies, Other | 1 |  |  |  |  |  |  |
| 09.01 | Communication and Media Studies | 4 | 362 | 345 | 162 | 7 | 12 | 255 |
| 09.04 | Journalism | 7 | 273 | 259 | 308 | 8 | 9 | 23 |
| 09.07 | Radio, Television, and Digital Communication | 3 | 7 | 7 |  |  |  | 51 |
| 09.09 | Public Relations, Advertising, and Applied Communication | 11 | 124 | 109 | 78 | 9 | 7 | 55 |
| 09.10 | Publishing | 1 |  |  |  |  |  |  |
| 09.99 | Communication, Journalism, and Related Programs, Other | 1 |  |  |  |  |  |  |
| 10.01 | Communications Technologies/Technicians | 1 |  |  |  |  |  |  |
| 10.02 | Audiovisual Communications Technologies/Technicians | 5 | 9 | 2 | 5 |  | 5 | 2 |
| 10.03 | Graphic Communications | 9 | 25 | 18 | 20 |  | 3 | 1 |
| 10.99 | Communications Technologies/Technicians and Support Services, Other | 1 |  |  |  |  |  |  |
| 11.01 | Computer and Information Sciences, General | 6 | 1,466 | 1,425 | 195 | 7 | 18 | 502 |
| 11.02 | Computer Programming | 6 |  |  |  |  |  | 1,080 |
| 11.03 | Data Processing | 1 |  |  |  |  |  | 37 |
| 11.04 | Information Science/Studies | 1 | 173 | 173 | 60 | 4 |  | 6 |
| 11.05 | Computer Systems Analysis | 1 |  |  |  |  |  |  |
| 11.06 | Data Entry/Microcomputer Applications | 3 |  |  |  |  |  | 6 |
| 11.07 | Computer Science | 1 | 807 | 588 | 1,471 | 14 | 48 | 1,555 |
| 11.08 | Computer Software and Media Applications | 5 |  |  |  |  |  | 1,359 |
| 11.09 | Computer Systems Networking and Telecommunications | 3 | 21 | 11 | 7 |  | 5 | 119 |
| 11.10 | Computer/Information Technology Administration and Management | 7 | 23 | 22 | 32 | 2 |  | 99 |
| 11.99 | Computer and Information Sciences and Support Services, Other | 1 |  |  |  |  |  |  |
| 12.03 | Funeral Service and Mortuary Science | 4 | 2 |  |  |  |  |  |
| 12.04 | Cosmetology and Related Personal Grooming Services | 13 | 5 |  |  |  | 1 |  |
| 12.05 | Culinary Arts and Related Services | 12 | 55 | 23 | 24 |  | 9 | 24 |
| 12.06 | Casino Operations and Services | 3 | 2 |  |  |  |  |  |
| 12.99 | Culinary, Entertainment, and Personal Services, Other | 1 | 1 |  |  |  |  |  |
| 13.01 | Education, General | 1 | 287 | 274 | 89 | 1 | 8 | 221 |
| 13.02 | Bilingual, Multilingual, and Multicultural Education | 4 | 7 | 3 | 3 |  |  |  |
| 13.03 | Curriculum and Instruction | 1 | 152 | 152 | 81 | 1 |  | 27 |
| 13.04 | Educational Administration and Supervision | 14 | 365 | 362 | 12 | 3 |  | 31 |
| 13.05 | Educational/Instructional Media Design | 1 | 44 | 44 | 17 |  |  | 7 |
| 13.06 | Educational Assessment, Evaluation, and Research | 6 | 301 | 299 | 108 | 6 |  | 13 |
| 13.07 | International and Comparative Education | 1 |  |  |  |  |  |  |
| 13.09 | Social and Philosophical Foundations of Education | 1 |  |  |  |  |  |  |
| 13.10 | Special Education and Teaching | 18 | 100 | 99 | 29 | 3 |  | 1 |
| 13.11 | Student Counseling and Personnel Services | 3 | 102 | 102 | 11 | 5 |  | 20 |
| 13.12 | Teacher Education and Professional Development, Specific Levels and Methods | 14 | 205 | 182 | 287 | 9 | 12 | 77 |
| 13.13 | Teacher Education and Professional Development, Specific Subject Areas | 38 | 149 | 137 | 89 | 12 | 1 |  |
| 13.14 | Teaching English or French as a Second or Foreign Language | 3 | 1,957 | 1,954 |  |  | 3 | 2 |
| 13.15 | Teaching Assistants/Aides | 3 |  |  |  |  |  |  |
| 13.99 | Education, Other | 1 | 16 | 16 |  |  |  |  |
| 14.01 | Engineering, General | 3 | 185 | 176 | 40 | 6 | 16 | 389 |
| 14.02 | Aerospace, Aeronautical, and Astronautical/Space Engineering | 3 | 195 | 195 | 260 | 5 |  | 157 |
| 14.03 | Agricultural Engineering | 1 | 107 | 107 | 104 | 10 |  | 2 |
| 14.04 | Architectural Engineering | 1 | 4 | 2 | 1 |  |  | 2 |
| 14.05 | Biomedical/Medical Engineering | 1 | 74 | 74 | 96 | 2 |  | 47 |
| 14.06 | Ceramic Sciences and Engineering | 1 | 11 | 11 | 9 |  |  |  |
| 14.07 | Chemical Engineering | 3 | 183 | 183 | 201 | 7 |  | 236 |
| 14.08 | Civil Engineering | 6 | 349 | 348 | 447 | 13 |  | 393 |
| 14.09 | Computer Engineering | 4 | 366 | 366 | 522 | 10 | 3 | 2 |
| 14.10 | Electrical, Electronics, and Communications Engineering | 4 | 120 | 120 | 133 | 4 |  | 504 |
| 14.11 | Engineering Mechanics | 1 | 90 | 90 | 117 | 1 |  | 4 |
| 14.12 | Engineering Physics | 1 | 3 | 3 | 1 |  |  | 6 |
| 14.13 | Engineering Science | 1 | 3 | 3 | 1 |  |  | 3 |
| 14.14 | Environmental/Environmental Health Engineering | 1 | 10 | 9 | 14 | 1 |  | 11 |
| 14.18 | Materials Engineering | 1 | 138 | 138 | 193 | 6 |  | 178 |
| 14.19 | Mechanical Engineering | 1 | 246 | 246 | 375 | 6 |  | 526 |
| 14.20 | Metallurgical Engineering | 1 | 4 | 2 | 1 |  |  | 2 |
| 14.21 | Mining and Mineral Engineering | 1 |  |  |  |  |  | 10 |
| 14.22 | Naval Architecture and Marine Engineering | 1 | 4 | 2 | 1 |  |  | 3 |
| 14.23 | Nuclear Engineering | 1 | 55 | 55 | 67 | 3 |  | 43 |
| 14.24 | Ocean Engineering | 1 |  |  |  |  |  | 37 |
| 14.25 | Petroleum Engineering | 1 | 4 | 2 | 1 |  |  | 2 |
| 14.27 | Systems Engineering | 1 | 57 | 57 | 50 | 6 |  | 47 |
| 14.28 | Textile Sciences and Engineering | 1 |  |  |  |  |  | 29 |
| 14.32 | Polymer/Plastics Engineering | 1 | 3 | 1 | 1 |  |  |  |
| 14.33 | Construction Engineering | 1 | 17 | 17 | 30 | 5 |  |  |
| 14.34 | Forest Engineering | 1 | 4 | 2 | 1 |  |  |  |
| 14.35 | Industrial Engineering | 1 | 185 | 185 | 231 | 9 |  | 6 |
| 14.36 | Manufacturing Engineering | 1 | 3 | 1 | 1 |  |  | 1 |
| 14.37 | Operations Research | 1 | 5 | 2 | 2 |  |  | 6 |
| 14.38 | Surveying Engineering | 1 | 3 | 1 | 1 |  |  |  |
| 14.39 | Geological/Geophysical Engineering | 1 | 3 | 1 | 1 |  |  |  |
| 14.40 | Paper Science and Engineering | 1 |  |  |  |  |  |  |
| 14.41 | Electromechanical Engineering | 1 |  |  |  |  |  |  |
| 14.42 | Mechatronics, Robotics, and Automation Engineering | 1 | 3 | 1 | 1 |  |  | 19 |
| 14.43 | Biochemical Engineering | 1 | 4 | 2 | 1 |  |  |  |
| 14.44 | Engineering Chemistry | 1 |  |  |  |  |  | 4 |
| 14.45 | Biological/Biosystems Engineering | 1 | 4 | 2 | 1 |  |  | 34 |
| 14.47 | Electrical and Computer Engineering | 1 | 4 | 2 | 1 |  |  | 196 |
| 14.48 | Energy Systems Engineering | 3 | 4 | 4 | 17 |  |  | 30 |
| 14.99 | Engineering, Other | 1 | 44 | 44 | 21 |  |  |  |
| 15.00 | Engineering Technologies/Technicians, General | 2 | 24 | 22 | 41 |  |  | 4 |
| 15.01 | Architectural Engineering Technologies/Technicians | 1 | 3 | 3 | 1 |  |  |  |
| 15.02 | Civil Engineering Technologies/Technicians | 1 | 39 | 39 | 47 |  |  |  |
| 15.03 | Electrical/Electronic Engineering Technologies/Technicians | 6 | 36 | 36 | 43 |  |  | 10 |
| 15.04 | Electromechanical Technologies/Technicians | 7 | 15 | 15 | 4 |  |  | 1 |
| 15.05 | Environmental Control Technologies/Technicians | 5 | 8 | 8 | 2 |  |  | 17 |
| 15.06 | Industrial Production Technologies/Technicians | 9 | 53 | 53 | 66 |  |  | 6 |
| 15.07 | Quality Control and Safety Technologies/Technicians | 6 | 7 | 7 | 2 |  |  | 8 |
| 15.08 | Mechanical Engineering Related Technologies/Technicians | 6 | 23 | 23 | 33 |  |  |  |
| 15.09 | Mining and Petroleum Technologies/Technicians | 3 |  |  |  |  |  |  |
| 15.10 | Construction Engineering Technology/Technician | 1 | 3 | 3 | 1 |  |  |  |
| 15.11 | Engineering-Related Technologies/Technicians | 3 | 3 | 3 | 1 |  |  |  |
| 15.12 | Computer Engineering Technologies/Technicians | 5 | 6 | 6 | 2 |  |  |  |
| 15.13 | Drafting/Design Engineering Technologies/Technicians | 8 | 2 |  |  |  | 1 | 4 |
| 15.14 | Nuclear Engineering Technology/Technician | 1 | 3 | 3 | 1 |  |  |  |
| 15.15 | Engineering-Related Fields | 4 | 4 | 3 | 1 |  |  | 4 |
| 15.16 | Nanotechnology | 1 |  |  |  |  |  | 7 |
| 15.17 | Energy Systems Technologies/Technicians | 7 | 5 |  |  |  | 1 |  |
| 15.99 | Engineering/Engineering-Related Technologies/Technicians, Other | 1 | 4 | 4 | 1 |  |  |  |
| 16.01 | Linguistic, Comparative, and Related Language Studies and Services | 6 | 451 | 446 | 167 | 15 | 11 | 390 |
| 16.02 | African Languages, Literatures, and Linguistics | 1 | 29 | 29 | 14 |  | 1 | 2 |
| 16.03 | East Asian Languages, Literatures, and Linguistics | 6 | 210 | 195 | 80 | 2 | 13 | 149 |
| 16.04 | Slavic, Baltic and Albanian Languages, Literatures, and Linguistics | 11 | 105 | 104 | 25 | 2 | 5 | 7 |
| 16.05 | Germanic Languages, Literatures, and Linguistics | 8 | 156 | 153 | 39 | 2 | 8 | 37 |
| 16.06 | Modern Greek Language and Literature | 1 |  |  |  |  | 1 | 1 |
| 16.07 | South Asian Languages, Literatures, and Linguistics | 8 | 39 | 39 | 9 |  | 43 | 1 |
| 16.08 | Iranian/Persian Languages, Literatures, and Linguistics | 1 |  |  |  |  |  |  |
| 16.09 | Romance Languages, Literatures, and Linguistics | 9 | 525 | 518 | 269 | 8 | 13 | 192 |
| 16.10 | American Indian/Native American Languages, Literatures, and Linguistics | 1 | 4 | 4 | 2 |  |  | 2 |
| 16.11 | Middle/Near Eastern and Semitic Languages, Literatures, and Linguistics | 5 | 64 | 63 | 29 |  | 4 | 2 |
| 16.12 | Classics and Classical Languages, Literatures, and Linguistics | 4 | 110 | 110 | 34 | 6 | 2 | 5 |
| 16.13 | Celtic Languages, Literatures, and Linguistics | 1 |  |  |  |  |  | 5 |
| 16.14 | Southeast Asian and Australasian/Pacific Languages, Literatures, and Linguistics | 11 |  |  |  |  | 3 | 4 |
| 16.15 | Turkic, Uralic-Altaic, Caucasian, and Central Asian Languages, Literatures, and Linguistics | 5 | 1 |  |  |  | 3 | 3 |
| 16.16 | American Sign Language | 4 | 25 | 25 | 16 |  |  | 3 |
| 16.17 | Second Language Learning | 1 | 3 | 3 |  |  |  | 2 |
| 16.18 | Armenian Languages, Literatures, and Linguistics | 1 |  |  |  |  |  |  |
| 16.99 | Foreign Languages, Literatures, and Linguistics, Other | 1 |  |  |  |  |  |  |
| 19.01 | Family and Consumer Sciences/Human Sciences, General | 1 | 40 | 31 | 10 | 3 | 16 |  |
| 19.02 | Family and Consumer Sciences/Human Sciences Business Services | 4 |  |  |  |  |  |  |
| 19.04 | Family and Consumer Economics and Related Studies | 4 | 791 | 769 | 8 |  | 12 | 54 |
| 19.05 | Foods, Nutrition, and Related Services | 4 | 113 | 113 | 107 |  |  | 62 |
| 19.06 | Housing and Human Environments | 4 |  |  |  |  |  | 2 |
| 19.07 | Human Development, Family Studies, and Related Services | 11 | 2,166 | 2,152 | 137 | 5 | 4 | 40 |
| 19.09 | Apparel and Textiles | 6 | 9 | 8 | 7 |  |  | 3 |
| 19.10 | Work and Family Studies | 1 |  |  |  |  |  |  |
| 19.99 | Family and Consumer Sciences/Human Sciences, Other | 1 |  |  |  |  |  |  |
| 22.00 | Non-Professional Legal Studies | 3 | 1 | 1 |  |  |  | 1 |
| 22.01 | Law | 1 | 406 | 377 | 151 | 6 | 32 | 175 |
| 22.02 | Legal Research and Advanced Professional Studies | 25 | 8 | 8 | 6 |  |  | 24 |
| 22.03 | Legal Support Services | 6 | 6 | 4 | 1 |  | 1 |  |
| 22.99 | Legal Professions and Studies, Other | 1 |  |  |  | 1 |  |  |
| 23.01 | English Language and Literature, General | 1 | 7,584 | 7,493 | 483 | 9 | 27 | 39 |
| 23.13 | Rhetoric and Composition/Writing Studies | 5 | 192 | 178 | 80 | 4 | 20 | 113 |
| 23.14 | Literature | 6 | 1 |  |  |  |  | 367 |
| 23.99 | English Language and Literature/Letters, Other | 1 |  |  |  |  |  |  |
| 24.01 | Liberal Arts and Sciences, General Studies and Humanities | 4 | 194 | 162 | 28 | 8 | 6 | 786 |
| 25.01 | Library Science and Administration | 4 | 402 | 389 | 14 | 1 | 10 | 17 |
| 25.03 | Library and Archives Assisting | 1 |  |  |  |  |  |  |
| 25.99 | Library Science, Other | 1 |  |  |  |  |  |  |
| 26.01 | Biology, General | 2 | 537 | 531 | 503 | 26 | 14 | 388 |
| 26.02 | Biochemistry, Biophysics and Molecular Biology | 10 | 105 | 104 | 97 | 9 | 7 | 22 |
| 26.03 | Botany/Plant Biology | 5 | 24 | 24 | 9 |  |  | 15 |
| 26.04 | Cell/Cellular Biology and Anatomical Sciences | 6 | 133 | 133 | 124 | 3 |  | 45 |
| 26.05 | Microbiological Sciences and Immunology | 9 | 92 | 92 | 95 | 6 |  | 62 |
| 26.07 | Zoology/Animal Biology | 6 | 29 | 29 | 18 |  |  | 6 |
| 26.08 | Genetics | 8 | 41 | 41 | 19 | 3 |  | 32 |
| 26.09 | Physiology, Pathology and Related Sciences | 13 | 178 | 178 | 159 | 5 |  | 29 |
| 26.10 | Pharmacology and Toxicology | 8 | 34 | 34 | 9 | 1 |  | 17 |
| 26.11 | Biomathematics, Bioinformatics, and Computational Biology | 5 | 55 | 55 | 107 | 4 |  | 29 |
| 26.12 | Biotechnology | 1 |  |  |  | 1 | 1 | 148 |
| 26.13 | Ecology, Evolution, Systematics, and Population Biology | 12 | 118 | 118 | 103 | 9 |  | 62 |
| 26.14 | Molecular Medicine | 1 | 13 | 13 | 3 |  |  |  |
| 26.15 | Neurobiology and Neurosciences | 5 | 59 | 56 | 31 | 3 | 9 | 27 |
| 26.99 | Biological and Biomedical Sciences, Other | 1 |  |  |  |  |  |  |
| 27.01 | Mathematics | 6 | 4,674 | 4,428 | 2,061 | 11 | 303 | 1,571 |
| 27.03 | Applied Mathematics | 6 | 15 | 10 | 15 | 1 | 14 | 1,075 |
| 27.05 | Statistics | 4 | 258 | 253 | 410 | 6 | 16 | 218 |
| 27.06 | Applied Statistics | 1 |  |  |  |  |  | 19 |
| 27.99 | Mathematics and Statistics, Other | 1 |  |  |  |  |  |  |
| 28.01 | Air Force ROTC, Air Science and Operations | 2 | 41 | 41 | 21 |  |  |  |
| 28.03 | Army ROTC, Military Science and Operations | 2 | 51 | 51 | 47 |  |  |  |
| 28.04 | Navy/Marine ROTC, Naval Science and Operations | 2 | 24 | 24 | 11 |  |  |  |
| 28.05 | Military Science and Operational Studies | 7 | 10 | 10 | 8 |  |  |  |
| 28.06 | Security Policy and Strategy | 6 | 15 | 15 | 14 |  |  |  |
| 28.07 | Military Economics and Management | 4 | 5 | 5 | 4 |  |  |  |
| 28.99 | Military Science, Leadership and Operational Art, Other | 1 | 1 | 1 |  |  |  |  |
| 29.02 | Intelligence, Command Control and Information Operations | 8 | 10 | 10 | 3 |  |  |  |
| 29.03 | Military Applied Sciences | 8 | 11 | 10 | 1 |  |  |  |
| 29.04 | Military Systems and Maintenance Technology | 10 | 8 | 6 | 2 |  |  |  |
| 29.06 | Military Technology and Applied Sciences Management | 1 |  |  |  |  |  |  |
| 29.99 | Military Technologies and Applied Sciences, Other | 1 |  |  |  |  |  |  |
| 30.00 | Multi-/Interdisciplinary Studies, General | 2 |  |  |  |  |  |  |
| 30.01 | Biological and Physical Sciences | 1 | 3,504 | 3,420 | 301 |  | 40 | 120 |
| 30.05 | Peace Studies and Conflict Resolution | 1 |  |  |  |  |  | 23 |
| 30.06 | Systems Science and Theory | 1 |  |  |  |  |  | 1 |
| 30.08 | Mathematics and Computer Science | 1 |  |  |  | 1 |  | 12 |
| 30.10 | Biopsychology | 1 |  |  |  |  |  |  |
| 30.11 | Gerontology | 1 | 50 | 50 | 10 |  |  | 2 |
| 30.12 | Historic Preservation and Conservation | 3 | 5 | 3 | 3 |  |  | 4 |
| 30.13 | Medieval and Renaissance Studies | 1 | 50 | 50 |  |  |  |  |
| 30.14 | Museology/Museum Studies | 1 | 42 | 38 | 16 |  | 1 |  |
| 30.15 | Science, Technology and Society | 1 | 6 | 4 | 4 |  |  | 52 |
| 30.16 | Accounting and Computer Science | 1 |  |  |  |  |  |  |
| 30.17 | Behavioral Sciences | 1 | 6 | 3 | 5 |  |  | 3 |
| 30.18 | Natural Sciences | 1 |  |  |  |  |  | 1 |
| 30.19 | Nutrition Sciences | 1 | 39 | 39 | 16 | 7 |  | 6 |
| 30.20 | International/Globalization Studies | 1 | 416 | 416 | 37 | 5 |  |  |
| 30.21 | Holocaust and Related Studies | 1 |  |  |  |  |  |  |
| 30.22 | Classical and Ancient Studies | 3 | 102 | 102 | 3 | 1 |  |  |
| 30.23 | Intercultural/Multicultural and Diversity Studies | 1 |  |  |  |  |  |  |
| 30.25 | Cognitive Science | 3 | 5 | 5 | 4 | 1 |  | 87 |
| 30.26 | Cultural Studies/Critical Theory and Analysis | 1 |  |  |  |  |  |  |
| 30.27 | Human Biology | 1 | 5 | 4 | 3 |  |  | 11 |
| 30.28 | Dispute Resolution | 1 |  |  |  |  |  | 3 |
| 30.29 | Maritime Studies | 1 |  |  |  |  |  |  |
| 30.30 | Computational Science | 1 |  |  |  |  |  | 7 |
| 30.31 | Human Computer Interaction | 1 | 20 | 20 | 4 |  |  | 2 |
| 30.32 | Marine Sciences | 1 |  |  |  |  |  |  |
| 30.33 | Sustainability Studies | 1 | 164 | 164 | 123 | 7 |  | 81 |
| 30.34 | Anthrozoology | 1 |  |  |  |  |  |  |
| 30.35 | Climate Science | 1 | 1 | 1 |  | 1 |  | 47 |
| 30.36 | Cultural Studies and Comparative Literature | 1 |  |  |  |  |  |  |
| 30.37 | Design for Human Health | 1 |  |  |  |  |  |  |
| 30.38 | Earth Systems Science | 1 |  |  |  |  |  |  |
| 30.39 | Economics and Computer Science | 1 | 7 | 5 | 6 |  |  |  |
| 30.40 | Economics and Foreign Language/Literature | 1 |  |  |  |  |  |  |
| 30.41 | Environmental Geosciences | 1 | 6 | 3 | 5 |  |  |  |
| 30.42 | Geoarcheaology | 1 |  |  |  |  |  |  |
| 30.43 | Geobiology | 1 | 6 | 3 | 4 |  |  | 1 |
| 30.44 | Geography and Environmental Studies | 1 |  |  |  |  |  |  |
| 30.45 | History and Language/Literature | 1 |  |  |  |  |  |  |
| 30.46 | History and Political Science | 1 |  |  |  |  |  |  |
| 30.47 | Linguistics and Anthropology | 1 |  |  |  |  |  | 1 |
| 30.48 | Linguistics and Computer Science | 1 |  |  |  |  |  |  |
| 30.49 | Mathematical Economics | 1 | 5 | 2 | 3 |  |  |  |
| 30.50 | Mathematics and Atmospheric/Oceanic Science | 1 |  |  |  |  |  |  |
| 30.51 | Philosophy, Politics, and Economics | 1 | 6 | 3 | 4 |  |  |  |
| 30.52 | Digital Humanities and Textual Studies | 4 | 4 | 3 | 2 |  |  | 1 |
| 30.53 | Thanatology | 1 |  |  |  |  |  |  |
| 30.70 | Data Science | 2 | 35 | 25 | 67 | 7 | 3 | 299 |
| 30.71 | Data Analytics | 5 |  |  |  | 1 |  | 614 |
| 30.99 | Multi/Interdisciplinary Studies, Other | 1 |  |  |  | 1 |  |  |
| 31.01 | Parks, Recreation, and Leisure Studies | 1 | 203 | 203 | 76 | 7 |  |  |
| 31.03 | Parks, Recreation, and Leisure Facilities Management | 3 |  |  |  |  |  |  |
| 31.05 | Sports, Kinesiology, and Physical Education/Fitness | 6 | 2,011 | 1,991 | 78 | 17 | 60 | 24 |
| 31.06 | Outdoor Education | 1 | 1 |  |  |  |  |  |
| 31.99 | Parks, Recreation, Leisure, Fitness, and Kinesiology, Other | 1 |  |  |  |  |  |  |
| 32.01 | Basic Skills and Developmental/Remedial Education | 10 | 68 | 36 | 26 |  | 33 | 177 |
| 32.02 | General Exam Preparation and Test-Taking Skills | 6 | 5 | 5 |  |  |  | 21 |
| 33.01 | Citizenship Activities | 7 | 32 | 13 | 3 |  | 6 | 4 |
| 34.01 | Health-Related Knowledge and Skills | 5 | 2,208 | 2,190 | 13 |  | 4 | 24 |
| 35.01 | Interpersonal and Social Skills | 5 | 380 | 373 |  |  |  | 1 |
| 36.01 | Leisure and Recreational Activities | 22 | 382 | 108 | 229 |  | 98 | 70 |
| 36.02 | Noncommercial Vehicle Operation | 7 | 37 | 10 | 20 |  | 10 |  |
| 37.01 | Personal Awareness and Self-Improvement | 7 | 14 | 3 | 8 |  | 6 | 85 |
| 38.00 | Philosophy and Religious Studies, General | 1 |  |  |  |  |  |  |
| 38.01 | Philosophy | 5 | 230 | 229 | 29 | 6 | 9 | 2,283 |
| 38.02 | Religion/Religious Studies | 10 | 355 | 311 | 65 | 5 | 16 | 26 |
| 38.99 | Philosophy and Religious Studies, Other | 1 |  |  |  |  |  |  |
| 39.02 | Bible/Biblical Studies | 1 |  |  |  |  |  | 1 |
| 39.03 | Missions/Missionary Studies and Missiology | 3 | 3 | 2 | 1 |  |  |  |
| 39.04 | Religious Education | 1 | 18 | 10 | 8 |  | 7 |  |
| 39.05 | Religious Music and Worship | 3 | 3 | 2 | 1 |  |  |  |
| 39.06 | Theological and Ministerial Studies | 5 | 27 | 3 | 17 |  | 18 | 1 |
| 39.07 | Pastoral Counseling and Specialized Ministries | 7 | 8 | 8 | 5 |  |  |  |
| 39.08 | Religious Institution Administration and Law | 3 |  |  |  |  |  | 1 |
| 39.99 | Theology and Religious Vocations, Other | 1 | 5 | 3 | 3 |  |  |  |
| 40.01 | Physical Sciences, General | 1 |  |  |  |  |  |  |
| 40.02 | Astronomy and Astrophysics | 4 | 104 | 101 | 100 | 8 | 10 | 33 |
| 40.04 | Atmospheric Sciences and Meteorology | 5 | 127 | 127 | 112 | 2 |  | 17 |
| 40.05 | Chemistry | 12 | 288 | 281 | 357 | 11 | 18 | 901 |
| 40.06 | Geological and Earth Sciences/Geosciences | 8 | 188 | 188 | 269 | 8 |  | 242 |
| 40.08 | Physics | 10 | 352 | 340 | 453 | 9 | 67 | 516 |
| 40.10 | Materials Sciences | 3 |  |  |  |  |  | 17 |
| 40.11 | Physics and Astronomy | 1 | 6 | 4 | 4 |  |  | 1 |
| 40.99 | Physical Sciences, Other | 1 |  |  |  |  |  |  |
| 41.00 | Science Technologies/Technicians, General | 1 |  |  |  |  |  |  |
| 41.01 | Biology/Biotechnology Technologies/Technicians | 1 |  |  |  |  |  |  |
| 41.02 | Nuclear and Industrial Radiologic Technologies/Technicians | 3 |  |  |  |  |  |  |
| 41.03 | Physical Science Technologies/Technicians | 3 | 3 | 3 | 1 |  |  |  |
| 41.99 | Science Technologies/Technicians, Other | 1 |  |  |  |  |  |  |
| 42.01 | Psychology, General | 1 | 635 | 622 | 429 | 8 | 27 | 92 |
| 42.27 | Research and Experimental Psychology | 11 | 8 | 5 | 5 |  |  | 18 |
| 42.28 | Clinical, Counseling and Applied Psychology | 18 | 83 | 82 | 51 | 2 |  | 7 |
| 42.99 | Psychology, Other | 1 |  |  |  |  |  |  |
| 43.01 | Criminal Justice and Corrections | 17 | 42 | 31 | 8 | 1 | 10 | 21 |
| 43.02 | Fire Protection | 7 | 23 |  | 10 |  | 9 | 2 |
| 43.03 | Homeland Security | 5 | 13 | 13 | 10 |  |  | 8 |
| 43.04 | Security Science and Technology | 9 | 5 | 3 | 4 |  |  |  |
| 43.99 | Homeland Security, Law Enforcement, Firefighting and Related Protective Services, Other | 1 |  |  |  |  |  |  |
| 44.00 | Human Services, General | 1 |  |  |  |  |  | 2 |
| 44.02 | Community Organization and Advocacy | 1 | 31 | 30 |  |  |  |  |
| 44.04 | Public Administration | 4 | 68 | 57 | 12 |  | 11 |  |
| 44.05 | Public Policy Analysis | 5 | 7 | 5 | 1 |  |  | 1 |
| 44.07 | Social Work | 4 | 231 | 217 | 233 | 5 | 11 | 17 |
| 44.99 | Public Administration and Social Service Professions, Other | 1 |  |  |  |  |  |  |
| 45.01 | Social Sciences, General | 4 | 6,087 | 6,067 |  |  | 129 | 474 |
| 45.02 | Anthropology | 6 | 335 | 330 | 123 | 8 | 11 | 107 |
| 45.03 | Archeology | 1 | 6 | 5 | 4 |  |  | 1 |
| 45.04 | Criminology | 1 | 57 | 57 | 36 | 2 |  | 4 |
| 45.05 | Demography | 3 |  |  |  |  |  | 1 |
| 45.06 | Economics | 6 | 361 | 350 | 500 | 8 | 52 | 578 |
| 45.07 | Geography and Cartography | 3 | 89 | 74 | 43 | 6 | 29 | 48 |
| 45.09 | International Relations and National Security Studies | 3 | 14 |  | 11 | 3 | 13 | 5 |
| 45.10 | Political Science and Government | 5 | 431 | 421 | 168 | 6 | 17 | 192 |
| 45.11 | Sociology | 4 | 265 | 258 | 107 | 5 | 18 | 73 |
| 45.12 | Urban Studies/Affairs | 1 | 5 | 3 | 3 |  |  | 1 |
| 45.13 | Sociology and Anthropology | 1 |  |  |  |  |  |  |
| 45.15 | Geography and Anthropology | 1 |  |  |  |  |  |  |
| 45.99 | Social Sciences, Other | 1 |  |  |  |  |  |  |
| 46.00 | Construction Trades, General | 1 | 49 | 13 | 21 |  | 4 | 4 |
| 46.01 | Mason/Masonry | 1 | 24 | 1 | 23 |  | 1 |  |
| 46.02 | Carpenters | 1 | 34 | 1 | 33 |  | 2 |  |
| 46.03 | Electrical and Power Transmission Installers | 4 | 64 | 15 | 44 |  | 11 | 1 |
| 46.04 | Building/Construction Finishing, Management, and Inspection | 13 | 17 | 8 | 5 |  |  | 1 |
| 46.05 | Plumbing and Related Water Supply Services | 5 | 45 | 1 | 43 |  | 3 |  |
| 46.99 | Construction Trades, Other | 1 |  |  |  |  |  |  |
| 47.00 | Mechanics and Repairers, General | 1 |  |  |  |  |  |  |
| 47.01 | Electrical/Electronics Maintenance and Repair Technologies/Technicians | 8 | 1 |  |  |  |  |  |
| 47.02 | Heating, Air Conditioning, Ventilation and Refrigeration Maintenance Technology/Technician (HAC, HACR, HVAC, HVACR) | 1 | 50 | 3 | 46 |  | 3 | 2 |
| 47.03 | Heavy/Industrial Equipment Maintenance Technologies/Technicians | 3 | 46 | 1 | 45 |  | 1 |  |
| 47.04 | Precision Systems Maintenance and Repair Technologies/Technicians | 6 | 4 | 2 | 2 |  |  |  |
| 47.06 | Vehicle Maintenance and Repair Technologies/Technicians | 18 | 87 | 44 | 55 |  | 10 | 19 |
| 47.07 | Energy Systems Maintenance and Repair Technologies/Technicians | 6 | 10 | 10 |  |  |  |  |
| 47.99 | Mechanic and Repair Technologies/Technicians, Other | 1 |  |  |  |  |  |  |
| 48.00 | Precision Production Trades, General | 1 |  |  |  |  |  |  |
| 48.03 | Leatherworking and Upholstery | 3 |  |  |  |  |  |  |
| 48.05 | Precision Metal Working | 9 | 50 | 9 | 35 |  | 10 |  |
| 48.07 | Woodworking | 5 | 7 |  | 6 |  | 4 | 1 |
| 48.08 | Boilermaking/Boilermaker | 1 |  |  |  |  |  |  |
| 48.99 | Precision Production, Other | 1 |  |  |  |  |  |  |
| 49.01 | Air Transportation | 8 | 35 | 21 | 14 |  | 12 | 1 |
| 49.02 | Ground Transportation | 7 | 38 | 2 | 29 |  | 1 |  |
| 49.03 | Marine Transportation | 4 | 10 | 6 | 1 |  | 2 |  |
| 49.99 | Transportation and Materials Moving, Other | 1 |  |  |  |  |  |  |
| 50.01 | Visual and Performing Arts, General | 2 | 4,207 | 4,163 | 42 |  | 98 | 57 |
| 50.02 | Crafts/Craft Design, Folk Art and Artisanry | 1 | 20 | 4 | 10 |  | 13 |  |
| 50.03 | Dance | 3 | 282 | 257 | 113 | 8 | 8 | 3 |
| 50.04 | Design and Applied Arts | 10 | 500 | 461 | 351 | 16 | 28 | 116 |
| 50.05 | Drama/Theatre Arts and Stagecraft | 11 | 361 | 344 | 216 | 12 | 19 | 34 |
| 50.06 | Film/Video and Photographic Arts | 5 | 244 | 228 | 253 | 6 | 21 | 45 |
| 50.07 | Fine and Studio Arts | 13 | 727 | 687 | 246 | 25 | 31 | 204 |
| 50.09 | Music | 17 | 1,102 | 980 | 446 | 21 | 54 | 399 |
| 50.10 | Arts, Entertainment, and Media Management | 5 | 4 | 1 | 2 |  | 1 | 3 |
| 50.11 | Community/Environmental/Socially-Engaged Art | 1 |  |  |  |  |  |  |
| 50.99 | Visual and Performing Arts, Other | 1 |  |  |  |  |  |  |
| 51.00 | Health Services/Allied Health/Health Sciences, General | 2 | 267 | 267 | 60 | 6 |  | 147 |
| 51.01 | Chiropractic | 1 | 81 | 53 | 27 |  |  |  |
| 51.02 | Communication Disorders Sciences and Services | 5 | 212 | 210 | 75 | 5 |  | 1 |
| 51.04 | Dentistry | 1 | 49 | 37 | 7 | 1 | 16 | 13 |
| 51.05 | Advanced/Graduate Dentistry and Oral Sciences | 15 | 167 | 167 | 77 | 5 |  | 3 |
| 51.06 | Dental Support Services and Allied Professions | 4 | 54 | 52 | 64 |  | 1 |  |
| 51.07 | Health and Medical Administrative Services | 24 | 61 | 55 | 32 | 4 | 3 | 12 |
| 51.08 | Allied Health and Medical Assisting Services | 14 | 15 | 9 | 1 |  | 2 | 3 |
| 51.09 | Allied Health Diagnostic, Intervention, and Treatment Professions | 24 | 334 | 282 | 275 | 11 | 22 | 3 |
| 51.10 | Clinical/Medical Laboratory Science/Research and Allied Professions | 13 | 8 |  |  | 1 | 1 | 2 |
| 51.11 | Health/Medical Preparatory Programs | 11 | 16 | 11 | 4 |  |  |  |
| 51.12 | Medicine | 4 | 336 | 299 | 94 | 2 | 30 | 190 |
| 51.14 | Medical Clinical Sciences/Graduate Medical Studies | 6 | 6 | 6 |  |  |  | 6 |
| 51.15 | Mental and Social Health Services and Allied Professions | 14 | 23 | 13 | 68 | 1 | 12 | 23 |
| 51.17 | Optometry | 1 | 2 | 1 |  |  |  |  |
| 51.18 | Ophthalmic and Optometric Support Services and Allied Professions | 5 | 5 | 2 | 2 |  |  |  |
| 51.20 | Pharmacy, Pharmaceutical Sciences, and Administration | 12 | 141 | 130 | 59 | 2 | 12 | 5 |
| 51.22 | Public Health | 13 | 139 | 127 | 68 | 17 | 6 | 121 |
| 51.23 | Rehabilitation and Therapeutic Professions | 17 | 155 | 127 | 63 | 4 | 23 | 3 |
| 51.26 | Health Aides/Attendants/Orderlies | 6 | 10 | 6 | 3 |  |  |  |
| 51.27 | Medical Illustration and Informatics | 3 |  |  |  |  |  |  |
| 51.31 | Dietetics and Clinical Nutrition Services | 5 | 53 | 40 | 16 | 7 | 10 |  |
| 51.32 | Health Professions Education, Ethics, and Humanities | 7 | 7 | 5 | 3 |  |  | 4 |
| 51.33 | Alternative and Complementary Medicine and Medical Systems | 8 | 10 | 8 | 5 |  |  |  |
| 51.34 | Alternative and Complementary Medical Support Services | 2 | 4 | 4 | 2 |  |  |  |
| 51.35 | Somatic Bodywork and Related Therapeutic Services | 4 | 4 | 3 |  |  | 2 | 2 |
| 51.36 | Movement and Mind-Body Therapies and Education | 4 | 8 |  | 4 |  | 4 |  |
| 51.37 | Energy and Biologically Based Therapies | 5 |  |  |  |  |  | 1 |
| 51.38 | Registered Nursing, Nursing Administration, Nursing Research and Clinical Nursing | 23 | 496 | 472 | 742 | 2 | 17 | 58 |
| 51.39 | Practical Nursing, Vocational Nursing and Nursing Assistants | 3 | 12 | 12 | 12 |  | 1 | 3 |
| 51.99 | Health Professions and Related Clinical Sciences, Other | 1 |  |  |  |  |  | 1 |
| 52.01 | Business/Commerce, General | 1 | 136 | 120 | 152 | 3 | 21 | 173 |
| 52.02 | Business Administration, Management and Operations | 17 | 534 | 446 | 169 | 13 | 16 | 1,770 |
| 52.03 | Accounting and Related Services | 6 | 198 | 174 | 198 | 6 | 22 | 175 |
| 52.04 | Business Operations Support and Assistant Services | 9 | 53 | 7 | 1 |  | 1 | 6 |
| 52.05 | Business/Corporate Communications | 3 |  |  |  |  |  | 42 |
| 52.06 | Business/Managerial Economics | 1 |  |  |  | 1 |  | 3 |
| 52.07 | Entrepreneurial and Small Business Operations | 5 | 102 | 102 | 58 | 5 |  | 56 |
| 52.08 | Finance and Financial Management Services | 9 | 312 | 285 | 247 | 7 | 17 | 296 |
| 52.09 | Hospitality Administration/Management | 10 | 189 | 176 | 77 | 5 | 7 | 7 |
| 52.10 | Human Resources Management and Services | 7 | 65 | 65 | 6 | 3 |  | 55 |
| 52.11 | International Business | 1 |  |  |  |  |  | 24 |
| 52.12 | Management Information Systems and Services | 4 | 133 | 133 | 112 | 4 |  | 7 |
| 52.13 | Management Sciences and Quantitative Methods | 4 | 142 | 132 | 131 | 7 | 4 | 11 |
| 52.14 | Marketing | 5 | 98 | 98 | 122 | 4 |  | 569 |
| 52.15 | Real Estate | 1 | 13 | 13 | 8 |  | 1 | 29 |
| 52.16 | Taxation | 1 |  |  |  |  |  | 16 |
| 52.17 | Insurance | 1 | 5 | 4 | 2 |  |  | 17 |
| 52.18 | General Sales, Merchandising and Related Marketing Operations | 5 | 27 | 7 | 6 |  | 4 | 8 |
| 52.19 | Specialized Sales, Merchandising and  Marketing Operations | 11 | 1 |  |  |  |  |  |
| 52.20 | Construction Management | 3 | 4 | 4 | 1 |  |  | 8 |
| 52.21 | Telecommunications Management | 1 |  |  |  |  |  |  |
| 52.99 | Business, Management, Marketing, and Related Support Services, Other | 1 |  |  |  |  |  |  |
| 53.01 | High School/Secondary Diploma Programs | 6 | 4 | 1 |  |  |  |  |
| 53.02 | High School/Secondary Certificate Programs | 4 | 5 | 5 |  |  |  |  |
| 54.01 | History | 9 | 571 | 560 | 56 | 7 | 33 | 287 |
| 60.01 | Dental Residency/Fellowship Programs | 11 | 7 | 2 | 4 |  |  |  |
| 60.03 | Veterinary Residency/Fellowship Programs | 21 | 13 | 7 | 10 |  |  |  |
| 60.07 | Nurse Practitioner Residency/Fellowship Programs | 52 | 5 | 5 | 2 |  |  |  |
| 60.08 | Pharmacy Residency/Fellowship Programs | 33 | 5 | 5 | 3 |  |  |  |
| 60.09 | Physician Assistant Residency/Fellowship Programs | 21 | 4 | 4 | 2 |  |  |  |
| 60.99 | Health Professions Residency/Fellowship Programs, Other | 1 |  |  |  |  |  |  |
| 61.01 | Combined Medical Residency/Fellowship Programs | 26 | 5 | 4 | 4 |  |  |  |
| 61.02 | Multiple-Pathway Medical Fellowship Programs | 18 | 19 | 19 | 19 |  |  |  |
| 61.03 | Allergy and Immunology Residency/Fellowship Programs | 2 | 3 | 1 | 3 |  |  |  |
| 61.04 | Anesthesiology Residency/Fellowship Programs | 2 | 6 | 5 | 7 |  |  |  |
| 61.05 | Dermatology Residency/Fellowship Programs | 4 | 4 | 3 | 5 |  |  |  |
| 61.06 | Emergency Medicine Residency/Fellowship Programs | 4 | 3 | 2 | 3 |  |  |  |
| 61.07 | Family Medicine Residency/Fellowship Programs | 2 | 4 | 2 | 3 |  |  |  |
| 61.08 | Internal Medicine Residency/Fellowship Programs | 15 | 18 | 17 | 17 |  |  |  |
| 61.09 | Medical Genetics and Genomics Residency/Fellowship Programs | 5 | 3 | 2 | 3 |  |  |  |
| 61.10 | Neurological Surgery Residency/Fellowship Programs | 2 | 4 | 2 | 3 |  |  |  |
| 61.11 | Neurology Residency/Fellowship Programs | 8 | 8 | 6 | 9 |  |  |  |
| 61.12 | Nuclear Medicine Residency/Fellowship Programs | 2 | 3 | 1 | 3 |  |  |  |
| 61.13 | Obstetrics and Gynecology Residency/Fellowship Programs | 5 | 6 | 5 | 6 |  |  |  |
| 61.14 | Ophthalmology Residency/Fellowship Programs | 2 | 4 | 2 | 4 |  |  |  |
| 61.15 | Orthopedic Surgery Residency/Fellowship Programs | 6 | 8 | 7 | 8 |  |  |  |
| 61.16 | Osteopathic Medicine Residency/Fellowship Programs | 2 | 3 | 2 | 1 |  |  |  |
| 61.17 | Otolaryngology Residency/Fellowship Programs | 4 | 3 | 2 | 3 |  |  |  |
| 61.18 | Pathology Residency/Fellowship Programs | 16 | 11 | 10 | 11 |  |  |  |
| 61.19 | Pediatrics Residency/Fellowship Programs | 17 | 18 | 17 | 18 |  |  |  |
| 61.20 | Physical Medicine and Rehabilitation Residency/Fellowship Programs | 4 | 4 | 3 | 5 |  |  |  |
| 61.21 | Plastic Surgery Residency/Fellowship Programs | 4 | 3 | 1 | 3 |  |  |  |
| 61.22 | Podiatric Medicine Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.23 | Preventive Medicine Residency/Fellowship Programs | 4 | 3 |  | 6 |  |  |  |
| 61.24 | Psychiatry Residency/Fellowship Programs | 7 | 7 | 6 | 7 |  |  |  |
| 61.25 | Radiation Oncology Residency/Fellowship Programs | 2 | 3 | 1 | 3 |  |  |  |
| 61.26 | Radiology Residency/Fellowship Programs | 13 | 9 | 6 | 11 |  |  |  |
| 61.27 | Surgery Residency/Fellowship Programs | 9 | 10 | 5 | 10 |  |  |  |
| 61.28 | Urology Residency/Fellowship Programs | 3 | 3 | 2 | 4 |  |  |  |
| 61.99 | Medical Residency/Fellowship Programs, Other | 1 | 6 | 3 | 3 |  |  |  |

## Four-Digit Families with Nothing

84 families hold no row, program, book or resource. Sorted by the count of six-digit programs in use.

| Code | Family | CIP programs |
|---|---|---|
| 01.82 | Veterinary Administrative Services | 5 |
| 19.02 | Family and Consumer Sciences/Human Sciences Business Services | 4 |
| 04.09 | Architectural Sciences and Technology | 3 |
| 13.15 | Teaching Assistants/Aides | 3 |
| 15.09 | Mining and Petroleum Technologies/Technicians | 3 |
| 31.03 | Parks, Recreation, and Leisure Facilities Management | 3 |
| 41.02 | Nuclear and Industrial Radiologic Technologies/Technicians | 3 |
| 48.03 | Leatherworking and Upholstery | 3 |
| 51.27 | Medical Illustration and Informatics | 3 |
| 01.13 | Agriculture/Veterinary Preparatory Programs | 2 |
| 30.00 | Multi-/Interdisciplinary Studies, General | 2 |
| 61.22 | Podiatric Medicine Residency/Fellowship Programs | 2 |
| 01.99 | Agricultural/Animal/Plant/Veterinary Science and Related Fields, Other | 1 |
| 03.99 | Natural Resources and Conservation, Other | 1 |
| 04.05 | Interior Architecture | 1 |
| 04.99 | Architecture and Related Services, Other | 1 |
| 05.99 | Area, Ethnic, Cultural, Gender, and Group Studies, Other | 1 |
| 09.10 | Publishing | 1 |
| 09.99 | Communication, Journalism, and Related Programs, Other | 1 |
| 10.01 | Communications Technologies/Technicians | 1 |
| 10.99 | Communications Technologies/Technicians and Support Services, Other | 1 |
| 11.05 | Computer Systems Analysis | 1 |
| 11.99 | Computer and Information Sciences and Support Services, Other | 1 |
| 13.07 | International and Comparative Education | 1 |
| 13.09 | Social and Philosophical Foundations of Education | 1 |
| 14.40 | Paper Science and Engineering | 1 |
| 14.41 | Electromechanical Engineering | 1 |
| 16.08 | Iranian/Persian Languages, Literatures, and Linguistics | 1 |
| 16.18 | Armenian Languages, Literatures, and Linguistics | 1 |
| 16.99 | Foreign Languages, Literatures, and Linguistics, Other | 1 |
| 19.10 | Work and Family Studies | 1 |
| 19.99 | Family and Consumer Sciences/Human Sciences, Other | 1 |
| 23.99 | English Language and Literature/Letters, Other | 1 |
| 25.03 | Library and Archives Assisting | 1 |
| 25.99 | Library Science, Other | 1 |
| 26.99 | Biological and Biomedical Sciences, Other | 1 |
| 27.99 | Mathematics and Statistics, Other | 1 |
| 29.06 | Military Technology and Applied Sciences Management | 1 |
| 29.99 | Military Technologies and Applied Sciences, Other | 1 |
| 30.10 | Biopsychology | 1 |
| 30.16 | Accounting and Computer Science | 1 |
| 30.21 | Holocaust and Related Studies | 1 |
| 30.23 | Intercultural/Multicultural and Diversity Studies | 1 |
| 30.26 | Cultural Studies/Critical Theory and Analysis | 1 |
| 30.29 | Maritime Studies | 1 |
| 30.32 | Marine Sciences | 1 |
| 30.34 | Anthrozoology | 1 |
| 30.36 | Cultural Studies and Comparative Literature | 1 |
| 30.37 | Design for Human Health | 1 |
| 30.38 | Earth Systems Science | 1 |
| 30.40 | Economics and Foreign Language/Literature | 1 |
| 30.42 | Geoarcheaology | 1 |
| 30.44 | Geography and Environmental Studies | 1 |
| 30.45 | History and Language/Literature | 1 |
| 30.46 | History and Political Science | 1 |
| 30.48 | Linguistics and Computer Science | 1 |
| 30.50 | Mathematics and Atmospheric/Oceanic Science | 1 |
| 30.53 | Thanatology | 1 |
| 31.99 | Parks, Recreation, Leisure, Fitness, and Kinesiology, Other | 1 |
| 38.00 | Philosophy and Religious Studies, General | 1 |
| 38.99 | Philosophy and Religious Studies, Other | 1 |
| 40.01 | Physical Sciences, General | 1 |
| 40.99 | Physical Sciences, Other | 1 |
| 41.00 | Science Technologies/Technicians, General | 1 |
| 41.01 | Biology/Biotechnology Technologies/Technicians | 1 |
| 41.99 | Science Technologies/Technicians, Other | 1 |
| 42.99 | Psychology, Other | 1 |
| 43.99 | Homeland Security, Law Enforcement, Firefighting and Related Protective Services, Other | 1 |
| 44.99 | Public Administration and Social Service Professions, Other | 1 |
| 45.13 | Sociology and Anthropology | 1 |
| 45.15 | Geography and Anthropology | 1 |
| 45.99 | Social Sciences, Other | 1 |
| 46.99 | Construction Trades, Other | 1 |
| 47.00 | Mechanics and Repairers, General | 1 |
| 47.99 | Mechanic and Repair Technologies/Technicians, Other | 1 |
| 48.00 | Precision Production Trades, General | 1 |
| 48.08 | Boilermaking/Boilermaker | 1 |
| 48.99 | Precision Production, Other | 1 |
| 49.99 | Transportation and Materials Moving, Other | 1 |
| 50.11 | Community/Environmental/Socially-Engaged Art | 1 |
| 50.99 | Visual and Performing Arts, Other | 1 |
| 52.21 | Telecommunications Management | 1 |
| 52.99 | Business, Management, Marketing, and Related Support Services, Other | 1 |
| 60.99 | Health Professions Residency/Fellowship Programs, Other | 1 |

## Codes Outside the Families in Use

4 four-digit codes hold items and sit outside the 457 families in use, because CIP 2020 moved or reserved them. They add to the 373 covered families for a total of 377 codes touched.

| Code | Title | CIP 2020 action | Rows | Programs | Books | Resources |
|---|---|---|---|---|---|---|
| 45.14 | Rural Sociology | Deleted |  |  |  | 1 |
| 51.24 | Veterinary Medicine | Moved from | 3 |  |  |  |
| 51.25 | Veterinary Biomedical and Clinical Sciences | Moved from | 8 |  |  |  |
| 60.06 | Podiatric Medicine Residency Programs | Moved from | 4 |  |  |  |

## SOC Minor Groups

Occupations counts SOC detailed occupations, then O*NET 31.0 occupations.

| Code | Minor group | Occupations | Rows | Verified | Edges | Programs | Books | Resources |
|---|---|---|---|---|---|---|---|---|
| 11-1000 | Top Executives | 3 / 4 | 9 | 5 |  | 23 | 61 | 2,331 |
| 11-2000 | Advertising, Marketing, Promotions, Public Relations, and Sales Managers | 5 / 5 | 14 | 1 | 2 | 30 | 53 | 2,872 |
| 11-3000 | Operations Specialties Managers | 10 / 19 | 19 |  |  | 72 | 153 | 7,208 |
| 11-9000 | Other Management Occupations | 20 / 31 | 42 | 2 | 2 | 363 | 1,078 | 16,459 |
| 13-1000 | Business Operations Specialists | 20 / 33 | 24 | 9 | 6 | 62 | 167 | 5,746 |
| 13-2000 | Financial Specialists | 15 / 17 | 52 | 19 | 26 | 30 | 131 | 4,460 |
| 15-1200 | Computer Occupations | 15 / 28 | 80 | 43 | 40 | 61 | 108 | 7,427 |
| 15-2000 | Mathematical Science Occupations | 6 / 10 | 36 | 6 | 23 | 54 | 626 | 13,376 |
| 17-1000 | Architects, Surveyors, and Cartographers | 4 / 5 | 41 | 26 | 25 | 10 | 75 | 369 |
| 17-2000 | Engineers | 18 / 35 | 11 | 8 | 3 | 92 | 16 | 2,937 |
| 17-3000 | Drafters, Engineering Technicians, and Mapping Technicians | 14 / 19 | 5 | 1 |  | 6 | 31 | 296 |
| 19-1000 | Life Scientists | 12 / 18 | 8 |  | 1 | 130 | 99 | 2,566 |
| 19-2000 | Physical Scientists | 9 / 13 | 1 |  | 1 | 56 | 120 | 2,127 |
| 19-3000 | Social Scientists and Related Workers | 13 / 17 | 12 | 2 | 6 | 89 | 376 | 4,612 |
| 19-4000 | Life, Physical, and Social Science Technicians | 12 / 16 |  |  |  | 152 | 370 | 3,751 |
| 19-5000 | Occupational Health and Safety Specialists and Technicians | 2 / 2 |  |  |  | 2 | 20 | 149 |
| 21-1000 | Counselors, Social Workers, and Other Community and Social Service Specialists | 15 / 15 | 13 | 8 | 4 | 29 | 43 | 626 |
| 21-2000 | Religious Workers | 3 / 3 | 19 | 7 | 12 |  | 25 | 117 |
| 23-1000 | Lawyers, Judges, and Related Workers | 5 / 5 | 50 | 25 | 75 | 6 | 32 | 225 |
| 23-2000 | Legal Support Workers | 3 / 3 | 5 | 4 | 1 |  | 1 | 1 |
| 25-1000 | Postsecondary Teachers | 37 / 37 | 8 | 7 | 5 | 727 | 1,937 | 27,067 |
| 25-2000 | Preschool, Elementary, Middle, Secondary, and Special Education Teachers | 13 / 14 | 13 | 1 | 5 | 146 | 797 | 6,580 |
| 25-3000 | Other Teachers and Instructors | 5 / 5 |  |  |  |  | 4 | 166 |
| 25-4000 | Librarians, Curators, and Archivists | 5 / 5 |  |  |  | 8 | 61 | 520 |
| 25-9000 | Other Educational Instruction and Library Occupations | 7 / 7 |  |  |  | 44 | 61 | 464 |
| 27-1000 | Art and Design Workers | 13 / 13 | 17 | 8 | 10 | 34 | 176 | 1,783 |
| 27-2000 | Entertainers and Performers, Sports and Related Workers | 11 / 14 | 22 | 5 | 14 | 47 | 146 | 633 |
| 27-3000 | Media and Communication Workers | 9 / 10 | 18 | 3 | 4 | 54 | 170 | 1,805 |
| 27-4000 | Media and Communication Equipment Workers | 8 / 8 | 9 | 2 | 5 | 12 | 157 | 907 |
| 29-1000 | Healthcare Diagnosing or Treating Practitioners | 45 / 61 | 408 | 240 | 220 | 54 | 219 | 410 |
| 29-2000 | Health Technologists and Technicians | 22 / 29 | 31 | 6 | 8 | 24 | 30 | 162 |
| 29-9000 | Other Healthcare Practitioners and Technical Occupations | 5 / 6 |  |  |  | 4 | 72 | 220 |
| 31-1100 | Home Health and Personal Care Aides; and Nursing Assistants, Orderlies, and Psychiatric Aides | 5 / 5 | 21 | 16 | 15 |  | 1 | 26 |
| 31-2000 | Occupational Therapy and Physical Therapist Assistants and Aides | 4 / 4 | 4 |  |  |  |  | 3 |
| 31-9000 | Other Healthcare Support Occupations | 9 / 11 | 36 | 21 | 5 |  | 5 | 19 |
| 33-1000 | Supervisors of Protective Service Workers | 5 / 5 | 2 |  |  | 1 | 19 | 31 |
| 33-2000 | Firefighting and Prevention Workers | 3 / 3 | 13 |  | 3 |  | 9 | 2 |
| 33-3000 | Law Enforcement Workers | 7 / 10 | 9 |  | 3 |  | 10 | 21 |
| 33-9000 | Other Protective Service Workers | 9 / 10 | 15 | 5 | 3 |  | 10 | 21 |
| 35-1000 | Supervisors of Food Preparation and Serving Workers | 2 / 2 | 34 | 23 | 18 |  | 9 | 86 |
| 35-2000 | Cooks and Food Preparation Workers | 7 / 7 | 5 |  |  |  | 9 | 86 |
| 35-3000 | Food and Beverage Serving Workers | 4 / 5 | 5 |  |  |  |  | 24 |
| 35-9000 | Other Food Preparation and Serving Related Workers | 4 / 4 | 3 |  |  |  |  |  |
| 37-1000 | Supervisors of Building and Grounds Cleaning and Maintenance Workers | 2 / 2 | 2 |  |  |  | 6 | 1 |
| 37-2000 | Building Cleaning and Pest Control Workers | 4 / 4 | 23 | 17 | 10 |  |  |  |
| 37-3000 | Grounds Maintenance Workers | 4 / 4 | 9 | 4 | 2 |  | 6 |  |
| 39-1000 | Supervisors of Personal Care and Service Workers | 3 / 3 | 2 |  |  |  | 7 | 7 |
| 39-2000 | Animal Care and Service Workers | 2 / 2 | 2 |  |  |  |  |  |
| 39-3000 | Entertainment Attendants and Related Workers | 9 / 9 | 7 |  |  |  | 14 | 34 |
| 39-4000 | Funeral Service Workers | 4 / 4 | 2 |  |  |  |  |  |
| 39-5000 | Personal Appearance Workers | 6 / 6 | 5 |  |  |  | 1 |  |
| 39-6000 | Baggage Porters, Bellhops, and Concierges | 2 / 2 | 2 |  |  |  |  |  |
| 39-7000 | Tour and Travel Guides | 2 / 2 | 1 |  |  | 7 | 40 | 295 |
| 39-9000 | Other Personal Care and Service Workers | 5 / 6 | 2 |  |  |  | 58 | 84 |
| 41-1000 | Supervisors of Sales Workers | 2 / 2 | 2 |  |  |  | 22 | 1,778 |
| 41-2000 | Retail Sales Workers | 5 / 5 | 6 | 1 |  |  | 4 | 8 |
| 41-3000 | Sales Representatives, Services | 5 / 5 | 24 | 18 | 7 | 1 | 21 | 321 |
| 41-4000 | Sales Representatives, Wholesale and Manufacturing | 2 / 3 | 4 | 1 |  |  | 4 | 10 |
| 41-9000 | Other Sales and Related Workers | 8 / 8 | 21 | 13 | 8 |  | 5 | 38 |
| 43-1000 | Supervisors of Office and Administrative Support Workers | 1 / 1 | 1 |  |  |  | 13 | 1,790 |
| 43-2000 | Communications Equipment Operators | 3 / 3 | 3 |  |  |  |  |  |
| 43-3000 | Financial Clerks | 8 / 8 | 19 | 11 | 6 |  | 30 | 477 |
| 43-4000 | Information and Record Clerks | 17 / 17 | 17 |  |  | 3 | 30 | 532 |
| 43-5000 | Material Recording, Scheduling, Dispatching, and Distributing Workers | 11 / 12 | 15 | 1 |  |  | 1 | 6 |
| 43-6000 | Secretaries and Administrative Assistants | 4 / 4 | 5 |  |  |  | 1 | 18 |
| 43-9000 | Other Office and Administrative Support Workers | 10 / 10 | 11 | 1 |  | 17 | 51 | 405 |
| 45-1000 | Supervisors of Farming, Fishing, and Forestry Workers | 1 / 1 | 1 |  |  | 19 | 16 | 23 |
| 45-2000 | Agricultural Workers | 7 / 7 | 7 |  |  |  | 2 |  |
| 45-3000 | Fishing and Hunting Workers | 1 / 1 | 5 | 2 |  |  |  |  |
| 45-4000 | Forest, Conservation, and Logging Workers | 5 / 5 | 7 | 2 |  | 4 | 15 | 3 |
| 47-1000 | Supervisors of Construction and Extraction Workers | 1 / 2 |  |  |  |  | 20 | 6 |
| 47-2000 | Construction Trades Workers | 30 / 31 | 225 | 26 | 185 |  | 18 | 2 |
| 47-3000 | Helpers, Construction Trades | 7 / 7 |  |  |  |  |  |  |
| 47-4000 | Other Construction and Related Workers | 9 / 11 |  |  |  |  | 5 | 18 |
| 47-5000 | Extraction Workers | 14 / 14 |  |  |  |  | 1 |  |
| 49-1000 | Supervisors of Installation, Maintenance, and Repair Workers | 1 / 1 |  |  |  | 1 | 13 | 1,790 |
| 49-2000 | Electrical and Electronic Equipment Mechanics, Installers, and Repairers | 11 / 11 |  |  |  |  | 14 | 187 |
| 49-3000 | Vehicle and Mobile Equipment Mechanics, Installers, and Repairers | 14 / 14 | 87 | 44 | 55 |  | 10 | 19 |
| 49-9000 | Other Installation, Maintenance, and Repair Occupations | 25 / 26 | 101 | 4 | 92 |  | 15 | 22 |
| 51-1000 | Supervisors of Production Workers | 1 / 1 |  |  |  | 1 | 12 | 1,770 |
| 51-2000 | Assemblers and Fabricators | 10 / 10 |  |  |  |  | 5 | 19 |
| 51-3000 | Food Processing Workers | 8 / 8 |  |  |  |  |  | 38 |
| 51-4000 | Metal Workers and Plastic Workers | 24 / 24 | 46 | 6 | 34 |  | 10 | 6 |
| 51-5100 | Printing Workers | 3 / 3 |  |  |  |  |  | 1 |
| 51-6000 | Textile, Apparel, and Furnishings Workers | 15 / 15 |  |  |  |  |  | 3 |
| 51-7000 | Woodworkers | 7 / 7 |  |  |  |  | 4 | 1 |
| 51-8000 | Plant and System Operators | 9 / 12 |  |  |  |  |  | 17 |
| 51-9000 | Other Production Occupations | 30 / 34 | 4 | 3 | 1 |  | 6 | 257 |
| 53-1000 | Supervisors of Transportation and Material Moving Workers | 5 / 6 |  |  |  |  | 4 | 1 |
| 53-2000 | Air Transportation Workers | 5 / 5 | 35 | 21 | 14 |  | 12 | 1 |
| 53-3000 | Motor Vehicle Operators | 9 / 9 | 9 | 1 | 6 |  |  | 3 |
| 53-4000 | Rail Transportation Workers | 6 / 6 | 3 |  | 1 |  |  |  |
| 53-5000 | Water Transportation Workers | 4 / 4 | 6 | 4 | 1 |  | 2 |  |
| 53-6000 | Other Transportation Workers | 8 / 10 |  |  |  |  | 11 |  |
| 53-7000 | Material Moving Workers | 16 / 17 |  |  |  |  | 1 |  |
| 55-1000 | Military Officer Special and Tactical Operations Leaders | 8 / 8 | 13 |  | 9 |  |  | 8 |
| 55-2000 | First-Line Enlisted Military Supervisors | 3 / 3 |  |  |  |  |  |  |
| 55-3000 | Military Enlisted Tactical Operations and Air/Weapons Specialists and Crew Members | 8 / 8 | 1 | 1 |  |  |  | 8 |

## SOC Minor Groups with No Occupation Row

| Code | Minor group | Occupations | Reached through the crosswalk |
|---|---|---|---|
| 19-4000 | Life, Physical, and Social Science Technicians | 12 | yes |
| 19-5000 | Occupational Health and Safety Specialists and Technicians | 2 | yes |
| 25-3000 | Other Teachers and Instructors | 5 | yes |
| 25-4000 | Librarians, Curators, and Archivists | 5 | yes |
| 25-9000 | Other Educational Instruction and Library Occupations | 7 | yes |
| 29-9000 | Other Healthcare Practitioners and Technical Occupations | 5 | yes |
| 47-1000 | Supervisors of Construction and Extraction Workers | 1 | yes |
| 47-3000 | Helpers, Construction Trades | 7 | no |
| 47-4000 | Other Construction and Related Workers | 9 | yes |
| 47-5000 | Extraction Workers | 14 | yes |
| 49-1000 | Supervisors of Installation, Maintenance, and Repair Workers | 1 | yes |
| 49-2000 | Electrical and Electronic Equipment Mechanics, Installers, and Repairers | 11 | yes |
| 51-1000 | Supervisors of Production Workers | 1 | yes |
| 51-2000 | Assemblers and Fabricators | 10 | yes |
| 51-3000 | Food Processing Workers | 8 | yes |
| 51-5100 | Printing Workers | 3 | yes |
| 51-6000 | Textile, Apparel, and Furnishings Workers | 15 | yes |
| 51-7000 | Woodworkers | 7 | yes |
| 51-8000 | Plant and System Operators | 9 | yes |
| 53-1000 | Supervisors of Transportation and Material Moving Workers | 5 | yes |
| 53-6000 | Other Transportation Workers | 8 | yes |
| 53-7000 | Material Moving Workers | 16 | yes |
| 55-2000 | First-Line Enlisted Military Supervisors | 3 | no |

## Rows Mapped at SOC Major Group Alone

| Code | Major group | Rows |
|---|---|---|
| 11-0000 | Management Occupations | 19 |
| 41-0000 | Sales and Related Occupations | 9 |
| 43-0000 | Office and Administrative Support Occupations | 9 |
| 45-0000 | Farming, Fishing, and Forestry Occupations | 11 |
| 55-0000 | Military Specific Occupations | 11 |

## Unmapped Rows

| Table | Rows with no CIP code |
|---|---|
| frameworks | 261 |
| progression | 24,864 |
| assessments | 25 |
| courses | 504 |
| books | 139 |
| resources | 27,553 |
| programs | 246 |

| Slice | Label absent from field_map.tsv | Rows |
|---|---|---|
| beyond-school | artisanal fishing | 1 |
| beyond-school | artisanal mining | 2 |
| beyond-school | assistive technology | 6 |
| beyond-school | auditory training | 5 |
| beyond-school | augmentative and alternative communication | 8 |
| beyond-school | birth support | 6 |
| beyond-school | blindness skills | 10 |
| beyond-school | braille | 8 |
| beyond-school | braille mathematics | 1 |
| beyond-school | braille transcription | 2 |
| beyond-school | childcare | 2 |
| beyond-school | children's time allocation | 1 |
| beyond-school | children's work and play | 3 |
| beyond-school | craft apprenticeship | 2 |
| beyond-school | daily living skills | 4 |
| beyond-school | deafblind communication | 9 |
| beyond-school | domestic work | 2 |
| beyond-school | early and alternative communication | 9 |
| beyond-school | family caregiving | 17 |
| beyond-school | family caregiving, dementia | 2 |
| beyond-school | farming knowledge | 2 |
| beyond-school | fishing knowledge | 1 |
| beyond-school | food preservation | 14 |
| beyond-school | genealogy memorisation | 1 |
| beyond-school | growing food | 3 |
| beyond-school | herding | 6 |
| beyond-school | home and social care | 4 |
| beyond-school | home care | 18 |
| beyond-school | home economics | 17 |
| beyond-school | human activity backbone | 3 |
| beyond-school | hunting skill by age | 1 |
| beyond-school | informal apprenticeship | 11 |
| beyond-school | language revitalisation | 8 |
| beyond-school | learning in family and community | 8 |
| beyond-school | lip-reading | 2 |
| beyond-school | market arithmetic | 2 |
| beyond-school | memorised recitation | 2 |
| beyond-school | midwifery | 14 |
| beyond-school | navigation | 11 |
| beyond-school | oral epic | 6 |
| beyond-school | oral history and music | 3 |
| beyond-school | orientation and mobility | 11 |
| beyond-school | sign language | 20 |
| beyond-school | sign language interpreting | 3 |
| beyond-school | street vending and market trading | 2 |
| beyond-school | subsistence farming | 1 |
| beyond-school | subsistence skill acquisition | 1 |
| beyond-school | subsistence skills | 19 |
| beyond-school | tailoring | 4 |
| beyond-school | traditional ecological knowledge | 2 |
| beyond-school | waste picking | 2 |
| beyond-school | weaving | 5 |
| history-forecast | attainment | 15 |
| history-forecast | curriculum | 41 |
| history-forecast | licensing | 22 |
| history-technology | training response to technology | 72 |
| k12-full | career and technical education | 24127 |
| k12-full | other | 42 |
| lifespan | adult learning theory | 8 |
| lifespan | caring for ageing parents | 11 |
| lifespan | child development | 173 |
| lifespan | chores and independence | 11 |
| lifespan | cognitive development | 11 |
| lifespan | cognitive training | 5 |
| lifespan | digital and media habits | 12 |
| lifespan | early mathematics | 21 |
| lifespan | emergent literacy | 10 |
| lifespan | end-of-life preparation | 7 |
| lifespan | executive function | 10 |
| lifespan | first job | 9 |
| lifespan | first language acquisition | 16 |
| lifespan | health education | 9 |
| lifespan | health self-management | 7 |
| lifespan | housing | 9 |
| lifespan | learning in later life | 4 |
| lifespan | meta-learning | 40 |
| lifespan | mid-career change | 19 |
| lifespan | moral reasoning | 8 |
| lifespan | motor development | 10 |
| lifespan | parenting | 13 |
| lifespan | partnership | 3 |
| lifespan | play | 10 |
| lifespan | puberty and health education | 7 |
| lifespan | reading development | 7 |
| lifespan | retirement planning | 12 |
| lifespan | returning to study | 4 |
| lifespan | self-care | 4 |
| lifespan | sex education | 8 |
| lifespan | social and emotional development | 33 |
| lifespan | technology in later life | 6 |
| lifespan | theory of mind | 7 |
