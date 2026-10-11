# Backbone Coverage

The consolidated progressions corpus measured against CIP 2020 and SOC 2018. 248 of 457 four-digit CIP families in use hold a row, a program, a book or a resource. 93 of 98 SOC minor groups hold an occupation row or are reached from a program, a book or a resource through the CIP to SOC crosswalk.

## Method

`build/consolidate.py` writes a `cip` object on every row and an `onet_soc` object on every occupation row. `coverage.py` reads those codes and holds no label rules of its own. The label to code table is `field_map.tsv`, an editorial mapping; catalogue courses and programs carry the code their department or program title matched; resources carry the provider field guess. `mapping_verified` is true only where the source prints the code, which holds for the O*NET profile rows.

Rows counts frameworks, progression, assessments and courses. Verified counts the rows among them with `verified` true, or `page_fetched` true for courses and programs. Edges counts prerequisite edges whose dependent row sits in the family. A six-digit code rolls up to its four-digit family. A row mapped at two digits counts toward its series alone. In the SOC tables, programs, books and resources are those whose CIP code the NCES and BLS crosswalk joins to an occupation in the group, so one item can count toward several groups.

## Tables

| Table | Rows | Verified or page fetched | Share | CIP mapped | Two-digit | Four-digit | Six-digit | CIP code stated by source | SOC mapped | SOC code stated by source |
|---|---|---|---|---|---|---|---|---|---|---|
| frameworks | 581 | 281 | 48.4% | 581 | 27 | 292 | 262 | 0 | 229 |  |
| progression | 5,350 | 2,711 | 50.7% | 5,350 | 189 | 3,245 | 1,916 | 0 | 1,388 | 228 |
| assessments | 490 | 231 | 47.1% | 490 | 13 | 223 | 254 | 0 | 264 |  |
| courses | 25,908 | 25,908 | 100.0% | 25,404 |  |  | 25,404 | 0 |  |  |
| books | 1,636 | 1,300 | 79.5% | 1,636 | 55 | 964 | 617 | 0 |  |  |
| resources | 53,459 | 19,419 | 36.3% | 47,988 | 845 | 47,143 |  | 0 |  |  |
| programs | 1,058 | 843 | 79.7% | 812 |  |  | 812 | 0 |  |  |
| edges | 22,130 | 19,207 stated | 86.8% | | | | | | | |

690 edges point at a course code with no row and carry `external` true.

## CIP Series

Families counts four-digit groups in use. Series only counts items mapped at two digits.

| Code | Series | Families | Covered | Rows | Verified | Edges | Programs | Books | Resources | Series only |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Agricultural/Animal/Plant/Veterinary Science And Related Fields | 19 | 15 | 1,308 | 1,257 | 890 | 46 | 65 | 155 |  |
| 03 | Natural Resources And Conservation | 6 | 4 | 270 | 249 | 164 | 13 | 26 | 467 | 467 |
| 04 | Architecture And Related Services | 9 | 4 | 695 | 650 | 304 | 17 | 47 | 538 |  |
| 05 | Area, Ethnic, Cultural, Gender, And Group Studies | 3 | 2 | 927 | 920 | 188 | 11 | 13 | 146 | 166 |
| 09 | Communication, Journalism, And Related Programs | 6 | 4 | 766 | 720 | 548 | 24 | 28 | 572 |  |
| 10 | Communications Technologies/Technicians And Support Services | 4 | 2 | 34 | 20 | 25 |  | 8 | 117 | 117 |
| 11 | Computer And Information Sciences And Support Services | 11 | 7 | 1,219 | 953 | 1,765 | 27 | 62 | 15,760 |  |
| 12 | Culinary, Entertainment, And Personal Services | 5 | 5 | 75 | 23 | 24 |  | 10 | 65 | 10 |
| 13 | Education | 15 | 11 | 1,724 | 1,667 | 723 | 40 | 24 | 562 |  |
| 14 | Engineering | 41 | 22 | 2,436 | 2,425 | 2,927 | 94 | 19 | 3,003 |  |
| 15 | Engineering/Engineering-Related Technologies/Technicians | 19 | 7 | 182 | 173 | 230 |  | 2 | 106 |  |
| 16 | Foreign Languages, Literatures, And Linguistics | 19 | 15 | 1,871 | 1,733 | 770 | 35 | 86 | 1,400 | 170 |
| 19 | Family And Consumer Sciences/Human Sciences | 9 | 4 | 406 | 371 | 253 | 8 | 22 | 166 |  |
| 21 | Reserved | 0 | 0 |  |  |  |  |  |  |  |
| 22 | Legal Professions And Studies | 5 | 3 | 412 | 381 | 152 | 7 | 33 | 316 |  |
| 23 | English Language And Literature/Letters | 4 | 3 | 909 | 806 | 364 | 13 | 38 | 963 | 15 |
| 24 | Liberal Arts And Sciences, General Studies And Humanities | 1 | 1 | 194 | 162 | 28 | 8 | 6 | 304 |  |
| 25 | Library Science | 3 | 1 | 63 | 50 | 14 | 1 | 10 | 133 |  |
| 26 | Biological And Biomedical Sciences | 15 | 14 | 1,418 | 1,408 | 1,277 | 70 | 27 | 965 |  |
| 27 | Mathematics And Statistics | 5 | 3 | 1,370 | 1,124 | 1,951 | 18 | 162 | 2,811 |  |
| 28 | Military Science, Leadership And Operational Art | 7 | 3 | 144 | 122 | 96 |  | 14 | 5 | 47 |
| 29 | Military Technologies And Applied Sciences | 5 | 0 |  |  |  |  |  |  |  |
| 30 | Multi/Interdisciplinary Studies | 51 | 15 | 1,073 | 986 | 547 | 32 | 16 | 2,274 |  |
| 31 | Parks, Recreation, Leisure, Fitness, And Kinesiology | 5 | 3 | 368 | 353 | 154 | 24 | 11 | 260 | 2 |
| 32 | Basic Skills And Developmental/Remedial Education | 2 | 1 | 68 | 36 | 26 |  | 17 | 177 |  |
| 33 | Citizenship Activities | 1 | 1 | 22 | 9 | 3 |  | 6 | 4 |  |
| 34 | Health-Related Knowledge And Skills | 1 | 1 | 25 | 9 | 13 |  | 4 | 46 |  |
| 35 | Interpersonal And Social Skills | 1 | 1 |  |  |  |  |  | 32 |  |
| 36 | Leisure And Recreational Activities | 2 | 2 | 410 | 111 | 244 |  | 107 | 121 |  |
| 37 | Personal Awareness And Self-Improvement | 1 | 1 | 14 | 3 | 8 |  | 6 | 441 |  |
| 38 | Philosophy And Religious Studies | 4 | 2 | 585 | 540 | 94 | 11 | 25 | 2,234 |  |
| 39 | Theology And Religious Vocations | 8 | 2 | 45 | 13 | 25 |  | 25 | 13 | 13 |
| 40 | Physical Sciences | 9 | 6 | 1,059 | 1,037 | 1,291 | 38 | 81 | 2,036 |  |
| 41 | Science Technologies/Technicians | 5 | 0 |  |  |  |  |  |  |  |
| 42 | Psychology | 4 | 2 | 718 | 704 | 480 | 10 | 23 | 279 |  |
| 43 | Homeland Security, Law Enforcement, Firefighting And Related Protective Services | 5 | 2 | 76 | 31 | 18 | 1 | 19 | 67 | 78 |
| 44 | Public Administration And Social Service Professions | 6 | 4 | 331 | 304 | 245 | 5 | 22 | 44 | 1 |
| 45 | Social Sciences | 14 | 8 | 1,553 | 1,490 | 988 | 38 | 87 | 1,324 |  |
| 46 | Construction Trades | 7 | 6 | 217 | 33 | 169 |  | 21 | 5 |  |
| 47 | Mechanic And Repair Technologies/Technicians | 8 | 5 | 184 | 48 | 146 |  | 14 | 25 |  |
| 48 | Precision Production | 6 | 3 | 57 | 9 | 41 |  | 14 | 35 |  |
| 49 | Transportation And Materials Moving | 4 | 3 | 83 | 29 | 44 |  | 15 | 30 | 30 |
| 50 | Visual And Performing Arts | 11 | 9 | 3,285 | 2,977 | 1,679 | 88 | 165 | 1,885 |  |
| 51 | Health Professions And Related Programs | 31 | 23 | 2,639 | 2,368 | 1,747 | 68 | 162 | 1,105 | 6 |
| 52 | Business, Management, Marketing, And Related Support Services | 22 | 16 | 2,015 | 1,762 | 1,289 | 58 | 73 | 6,672 | 7 |
| 53 | High School/Secondary Diplomas And Certificates | 2 | 1 | 4 | 1 |  |  |  |  |  |
| 54 | History | 1 | 1 | 571 | 560 | 56 | 7 | 21 | 325 |  |
| 55 | Reserved | 0 | 0 |  |  |  |  |  |  |  |
| 60 | Health Professions Residency/Fellowship Programs | 6 | 0 |  |  |  |  |  |  |  |
| 61 | Medical Residency/Fellowship Programs | 29 | 0 |  |  |  |  |  |  |  |

## CIP Four-Digit Families

CIP programs counts six-digit codes in use under the family.

| Code | Family | CIP programs | Rows | Verified | Edges | Programs | Books | Resources |
|---|---|---|---|---|---|---|---|---|
| 01.00 | Agriculture, General | 1 | 43 | 30 | 11 | 7 | 25 | 146 |
| 01.01 | Agricultural Business and Management | 7 | 103 | 103 | 126 | 4 |  |  |
| 01.02 | Agricultural Mechanization | 5 | 1 |  |  |  |  |  |
| 01.03 | Agricultural Production Operations | 9 | 32 | 20 | 5 | 2 | 2 |  |
| 01.04 | Agricultural and Food Products Processing | 1 | 1 |  |  |  |  |  |
| 01.05 | Agricultural and Domestic Animal Services | 6 |  |  |  |  |  |  |
| 01.06 | Applied Horticulture and Horticultural Business Services | 10 | 18 | 9 | 8 |  | 6 |  |
| 01.07 | International Agriculture | 1 | 11 | 11 | 1 |  |  |  |
| 01.08 | Agricultural Public Services | 3 | 12 | 12 | 1 |  |  |  |
| 01.09 | Animal Sciences | 8 | 260 | 260 | 307 | 9 |  |  |
| 01.10 | Food Science and Technology | 6 | 95 | 95 | 107 | 8 |  |  |
| 01.11 | Plant Sciences | 7 | 196 | 194 | 114 | 11 | 1 |  |
| 01.12 | Soil Sciences | 4 | 120 | 120 | 118 | 2 |  |  |
| 01.13 | Agriculture/Veterinary Preparatory Programs | 2 |  |  |  |  |  |  |
| 01.80 | Veterinary Medicine | 1 | 179 | 167 | 50 | 2 | 31 | 9 |
| 01.81 | Veterinary Biomedical and Clinical Sciences | 12 | 236 | 236 | 42 | 1 |  |  |
| 01.82 | Veterinary Administrative Services | 5 |  |  |  |  |  |  |
| 01.83 | Veterinary/Animal Health Technologies/Technicians | 2 | 1 |  |  |  |  |  |
| 01.99 | Agricultural/Animal/Plant/Veterinary Science and Related Fields, Other | 1 |  |  |  |  |  |  |
| 03.01 | Natural Resources Conservation and Research | 4 | 229 | 213 | 122 | 9 | 18 |  |
| 03.02 | Environmental/Natural Resources Management and Policy | 9 | 1 |  |  |  |  |  |
| 03.03 | Fishing and Fisheries Sciences and Management | 1 | 1 |  |  |  |  |  |
| 03.05 | Forestry | 8 | 39 | 36 | 42 | 4 | 8 |  |
| 03.06 | Wildlife and Wildlands Science and Management | 1 |  |  |  |  |  |  |
| 03.99 | Natural Resources and Conservation, Other | 1 |  |  |  |  |  |  |
| 04.02 | Architecture | 4 | 260 | 231 | 179 | 3 | 41 | 318 |
| 04.03 | City/Urban, Community, and Regional Planning | 1 | 248 | 244 | 57 | 7 | 1 | 220 |
| 04.04 | Environmental Design | 4 |  |  |  |  |  |  |
| 04.05 | Interior Architecture | 1 |  |  |  |  |  |  |
| 04.06 | Landscape Architecture | 1 | 187 | 175 | 68 | 5 | 4 |  |
| 04.08 | Architectural History, Criticism, and Conservation | 4 |  |  |  | 2 | 1 |  |
| 04.09 | Architectural Sciences and Technology | 3 |  |  |  |  |  |  |
| 04.10 | Real Estate Development | 1 |  |  |  |  |  |  |
| 04.99 | Architecture and Related Services, Other | 1 |  |  |  |  |  |  |
| 05.01 | Area Studies | 37 | 334 | 334 | 37 | 6 |  |  |
| 05.02 | Ethnic, Cultural Minority, Gender, and Group Studies | 12 | 586 | 586 | 145 | 5 |  |  |
| 05.99 | Area, Ethnic, Cultural, Gender, and Group Studies, Other | 1 |  |  |  |  |  |  |
| 09.01 | Communication and Media Studies | 4 | 362 | 345 | 162 | 7 | 12 | 572 |
| 09.04 | Journalism | 7 | 273 | 259 | 308 | 8 | 9 |  |
| 09.07 | Radio, Television, and Digital Communication | 3 | 7 | 7 |  |  |  |  |
| 09.09 | Public Relations, Advertising, and Applied Communication | 11 | 124 | 109 | 78 | 9 | 7 |  |
| 09.10 | Publishing | 1 |  |  |  |  |  |  |
| 09.99 | Communication, Journalism, and Related Programs, Other | 1 |  |  |  |  |  |  |
| 10.01 | Communications Technologies/Technicians | 1 |  |  |  |  |  |  |
| 10.02 | Audiovisual Communications Technologies/Technicians | 5 | 9 | 2 | 5 |  | 5 |  |
| 10.03 | Graphic Communications | 9 | 25 | 18 | 20 |  | 3 |  |
| 10.99 | Communications Technologies/Technicians and Support Services, Other | 1 |  |  |  |  |  |  |
| 11.01 | Computer and Information Sciences, General | 6 | 195 | 159 | 195 | 7 | 11 | 4,114 |
| 11.02 | Computer Programming | 6 |  |  |  |  |  | 7,198 |
| 11.03 | Data Processing | 1 |  |  |  |  |  |  |
| 11.04 | Information Science/Studies | 1 | 173 | 173 | 60 | 4 |  |  |
| 11.05 | Computer Systems Analysis | 1 |  |  |  |  |  |  |
| 11.06 | Data Entry/Microcomputer Applications | 3 |  |  |  |  |  |  |
| 11.07 | Computer Science | 1 | 807 | 588 | 1,471 | 14 | 46 | 1,689 |
| 11.08 | Computer Software and Media Applications | 5 |  |  |  |  |  | 1,958 |
| 11.09 | Computer Systems Networking and Telecommunications | 3 | 21 | 11 | 7 |  | 5 |  |
| 11.10 | Computer/Information Technology Administration and Management | 7 | 23 | 22 | 32 | 2 |  | 801 |
| 11.99 | Computer and Information Sciences and Support Services, Other | 1 |  |  |  |  |  |  |
| 12.03 | Funeral Service and Mortuary Science | 4 | 2 |  |  |  |  |  |
| 12.04 | Cosmetology and Related Personal Grooming Services | 13 | 5 |  |  |  | 1 |  |
| 12.05 | Culinary Arts and Related Services | 12 | 55 | 23 | 24 |  | 9 | 65 |
| 12.06 | Casino Operations and Services | 3 | 2 |  |  |  |  |  |
| 12.99 | Culinary, Entertainment, and Personal Services, Other | 1 | 1 |  |  |  |  |  |
| 13.01 | Education, General | 1 | 287 | 274 | 89 | 1 | 8 | 562 |
| 13.02 | Bilingual, Multilingual, and Multicultural Education | 4 |  |  |  |  |  |  |
| 13.03 | Curriculum and Instruction | 1 | 152 | 152 | 81 | 1 |  |  |
| 13.04 | Educational Administration and Supervision | 14 | 365 | 362 | 12 | 3 |  |  |
| 13.05 | Educational/Instructional Media Design | 1 | 44 | 44 | 17 |  |  |  |
| 13.06 | Educational Assessment, Evaluation, and Research | 6 | 301 | 299 | 108 | 6 |  |  |
| 13.07 | International and Comparative Education | 1 |  |  |  |  |  |  |
| 13.09 | Social and Philosophical Foundations of Education | 1 |  |  |  |  |  |  |
| 13.10 | Special Education and Teaching | 18 | 100 | 99 | 29 | 3 |  |  |
| 13.11 | Student Counseling and Personnel Services | 3 | 102 | 102 | 11 | 5 |  |  |
| 13.12 | Teacher Education and Professional Development, Specific Levels and Methods | 14 | 205 | 182 | 287 | 9 | 12 |  |
| 13.13 | Teacher Education and Professional Development, Specific Subject Areas | 38 | 149 | 137 | 89 | 12 | 1 |  |
| 13.14 | Teaching English or French as a Second or Foreign Language | 3 | 3 |  |  |  | 3 |  |
| 13.15 | Teaching Assistants/Aides | 3 |  |  |  |  |  |  |
| 13.99 | Education, Other | 1 | 16 | 16 |  |  |  |  |
| 14.01 | Engineering, General | 3 | 185 | 176 | 40 | 6 | 16 | 469 |
| 14.02 | Aerospace, Aeronautical, and Astronautical/Space Engineering | 3 | 195 | 195 | 260 | 5 |  | 193 |
| 14.03 | Agricultural Engineering | 1 | 107 | 107 | 104 | 10 |  |  |
| 14.04 | Architectural Engineering | 1 |  |  |  |  |  |  |
| 14.05 | Biomedical/Medical Engineering | 1 | 74 | 74 | 96 | 2 |  | 45 |
| 14.06 | Ceramic Sciences and Engineering | 1 | 11 | 11 | 9 |  |  |  |
| 14.07 | Chemical Engineering | 3 | 183 | 183 | 201 | 7 |  | 240 |
| 14.08 | Civil Engineering | 6 | 349 | 348 | 447 | 13 |  | 425 |
| 14.09 | Computer Engineering | 4 | 366 | 366 | 522 | 10 | 3 |  |
| 14.10 | Electrical, Electronics, and Communications Engineering | 4 | 120 | 120 | 133 | 4 |  | 701 |
| 14.11 | Engineering Mechanics | 1 | 90 | 90 | 117 | 1 |  |  |
| 14.12 | Engineering Physics | 1 |  |  |  |  |  |  |
| 14.13 | Engineering Science | 1 |  |  |  |  |  |  |
| 14.14 | Environmental/Environmental Health Engineering | 1 | 10 | 9 | 14 | 1 |  | 23 |
| 14.18 | Materials Engineering | 1 | 138 | 138 | 193 | 6 |  |  |
| 14.19 | Mechanical Engineering | 1 | 246 | 246 | 375 | 6 |  | 756 |
| 14.20 | Metallurgical Engineering | 1 |  |  |  |  |  |  |
| 14.21 | Mining and Mineral Engineering | 1 |  |  |  |  |  | 28 |
| 14.22 | Naval Architecture and Marine Engineering | 1 |  |  |  |  |  |  |
| 14.23 | Nuclear Engineering | 1 | 55 | 55 | 67 | 3 |  | 44 |
| 14.24 | Ocean Engineering | 1 |  |  |  |  |  | 40 |
| 14.25 | Petroleum Engineering | 1 |  |  |  |  |  |  |
| 14.27 | Systems Engineering | 1 | 57 | 57 | 50 | 6 |  |  |
| 14.28 | Textile Sciences and Engineering | 1 |  |  |  |  |  | 39 |
| 14.32 | Polymer/Plastics Engineering | 1 |  |  |  |  |  |  |
| 14.33 | Construction Engineering | 1 | 17 | 17 | 30 | 5 |  |  |
| 14.34 | Forest Engineering | 1 |  |  |  |  |  |  |
| 14.35 | Industrial Engineering | 1 | 185 | 185 | 231 | 9 |  |  |
| 14.36 | Manufacturing Engineering | 1 |  |  |  |  |  |  |
| 14.37 | Operations Research | 1 |  |  |  |  |  |  |
| 14.38 | Surveying Engineering | 1 |  |  |  |  |  |  |
| 14.39 | Geological/Geophysical Engineering | 1 |  |  |  |  |  |  |
| 14.40 | Paper Science and Engineering | 1 |  |  |  |  |  |  |
| 14.41 | Electromechanical Engineering | 1 |  |  |  |  |  |  |
| 14.42 | Mechatronics, Robotics, and Automation Engineering | 1 |  |  |  |  |  |  |
| 14.43 | Biochemical Engineering | 1 |  |  |  |  |  |  |
| 14.44 | Engineering Chemistry | 1 |  |  |  |  |  |  |
| 14.45 | Biological/Biosystems Engineering | 1 |  |  |  |  |  |  |
| 14.47 | Electrical and Computer Engineering | 1 |  |  |  |  |  |  |
| 14.48 | Energy Systems Engineering | 3 | 4 | 4 | 17 |  |  |  |
| 14.99 | Engineering, Other | 1 | 44 | 44 | 21 |  |  |  |
| 15.00 | Engineering Technologies/Technicians, General | 2 | 24 | 22 | 41 |  |  | 106 |
| 15.01 | Architectural Engineering Technologies/Technicians | 1 |  |  |  |  |  |  |
| 15.02 | Civil Engineering Technologies/Technicians | 1 | 39 | 39 | 47 |  |  |  |
| 15.03 | Electrical/Electronic Engineering Technologies/Technicians | 6 | 36 | 36 | 43 |  |  |  |
| 15.04 | Electromechanical Technologies/Technicians | 7 |  |  |  |  |  |  |
| 15.05 | Environmental Control Technologies/Technicians | 5 |  |  |  |  |  |  |
| 15.06 | Industrial Production Technologies/Technicians | 9 | 53 | 53 | 66 |  |  |  |
| 15.07 | Quality Control and Safety Technologies/Technicians | 6 |  |  |  |  |  |  |
| 15.08 | Mechanical Engineering Related Technologies/Technicians | 6 | 23 | 23 | 33 |  |  |  |
| 15.09 | Mining and Petroleum Technologies/Technicians | 3 |  |  |  |  |  |  |
| 15.10 | Construction Engineering Technology/Technician | 1 |  |  |  |  |  |  |
| 15.11 | Engineering-Related Technologies/Technicians | 3 |  |  |  |  |  |  |
| 15.12 | Computer Engineering Technologies/Technicians | 5 |  |  |  |  |  |  |
| 15.13 | Drafting/Design Engineering Technologies/Technicians | 8 | 2 |  |  |  | 1 |  |
| 15.14 | Nuclear Engineering Technology/Technician | 1 |  |  |  |  |  |  |
| 15.15 | Engineering-Related Fields | 4 |  |  |  |  |  |  |
| 15.16 | Nanotechnology | 1 |  |  |  |  |  |  |
| 15.17 | Energy Systems Technologies/Technicians | 7 | 5 |  |  |  | 1 |  |
| 15.99 | Engineering/Engineering-Related Technologies/Technicians, Other | 1 |  |  |  |  |  |  |
| 16.01 | Linguistic, Comparative, and Related Language Studies and Services | 6 | 451 | 446 | 167 | 15 | 11 | 1,192 |
| 16.02 | African Languages, Literatures, and Linguistics | 1 | 29 | 29 | 14 |  | 1 |  |
| 16.03 | East Asian Languages, Literatures, and Linguistics | 6 | 210 | 195 | 80 | 2 | 13 |  |
| 16.04 | Slavic, Baltic and Albanian Languages, Literatures, and Linguistics | 11 | 105 | 104 | 25 | 2 | 5 |  |
| 16.05 | Germanic Languages, Literatures, and Linguistics | 8 | 156 | 153 | 39 | 2 | 8 |  |
| 16.06 | Modern Greek Language and Literature | 1 |  |  |  |  | 1 |  |
| 16.07 | South Asian Languages, Literatures, and Linguistics | 8 | 39 | 39 | 9 |  | 1 |  |
| 16.08 | Iranian/Persian Languages, Literatures, and Linguistics | 1 |  |  |  |  |  |  |
| 16.09 | Romance Languages, Literatures, and Linguistics | 9 | 525 | 518 | 269 | 8 | 13 |  |
| 16.10 | American Indian/Native American Languages, Literatures, and Linguistics | 1 | 4 | 4 | 2 |  |  |  |
| 16.11 | Middle/Near Eastern and Semitic Languages, Literatures, and Linguistics | 5 | 64 | 63 | 29 |  | 4 |  |
| 16.12 | Classics and Classical Languages, Literatures, and Linguistics | 4 | 110 | 110 | 34 | 6 | 2 | 208 |
| 16.13 | Celtic Languages, Literatures, and Linguistics | 1 |  |  |  |  |  |  |
| 16.14 | Southeast Asian and Australasian/Pacific Languages, Literatures, and Linguistics | 11 |  |  |  |  | 3 |  |
| 16.15 | Turkic, Uralic-Altaic, Caucasian, and Central Asian Languages, Literatures, and Linguistics | 5 | 1 |  |  |  | 3 |  |
| 16.16 | American Sign Language | 4 | 25 | 25 | 16 |  |  |  |
| 16.17 | Second Language Learning | 1 | 3 | 3 |  |  |  |  |
| 16.18 | Armenian Languages, Literatures, and Linguistics | 1 |  |  |  |  |  |  |
| 16.99 | Foreign Languages, Literatures, and Linguistics, Other | 1 |  |  |  |  |  |  |
| 19.01 | Family and Consumer Sciences/Human Sciences, General | 1 | 40 | 31 | 10 | 3 | 8 |  |
| 19.02 | Family and Consumer Sciences/Human Sciences Business Services | 4 |  |  |  |  |  |  |
| 19.04 | Family and Consumer Economics and Related Studies | 4 | 13 |  | 4 |  | 10 |  |
| 19.05 | Foods, Nutrition, and Related Services | 4 | 113 | 113 | 107 |  |  | 127 |
| 19.06 | Housing and Human Environments | 4 |  |  |  |  |  |  |
| 19.07 | Human Development, Family Studies, and Related Services | 11 | 240 | 227 | 132 | 5 | 4 |  |
| 19.09 | Apparel and Textiles | 6 |  |  |  |  |  |  |
| 19.10 | Work and Family Studies | 1 |  |  |  |  |  |  |
| 19.99 | Family and Consumer Sciences/Human Sciences, Other | 1 |  |  |  |  |  |  |
| 22.00 | Non-Professional Legal Studies | 3 |  |  |  |  |  |  |
| 22.01 | Law | 1 | 406 | 377 | 151 | 6 | 32 | 316 |
| 22.02 | Legal Research and Advanced Professional Studies | 25 |  |  |  |  |  |  |
| 22.03 | Legal Support Services | 6 | 6 | 4 | 1 |  | 1 |  |
| 22.99 | Legal Professions and Studies, Other | 1 |  |  |  | 1 |  |  |
| 23.01 | English Language and Literature, General | 1 | 708 | 628 | 276 | 9 | 14 |  |
| 23.13 | Rhetoric and Composition/Writing Studies | 5 | 192 | 178 | 80 | 4 | 17 | 368 |
| 23.14 | Literature | 6 | 1 |  |  |  |  | 595 |
| 23.99 | English Language and Literature/Letters, Other | 1 |  |  |  |  |  |  |
| 24.01 | Liberal Arts and Sciences, General Studies and Humanities | 4 | 194 | 162 | 28 | 8 | 6 | 304 |
| 25.01 | Library Science and Administration | 4 | 63 | 50 | 14 | 1 | 10 | 133 |
| 25.03 | Library and Archives Assisting | 1 |  |  |  |  |  |  |
| 25.99 | Library Science, Other | 1 |  |  |  |  |  |  |
| 26.01 | Biology, General | 2 | 537 | 531 | 503 | 26 | 11 | 254 |
| 26.02 | Biochemistry, Biophysics and Molecular Biology | 10 | 105 | 104 | 97 | 9 | 7 | 239 |
| 26.03 | Botany/Plant Biology | 5 | 24 | 24 | 9 |  |  |  |
| 26.04 | Cell/Cellular Biology and Anatomical Sciences | 6 | 133 | 133 | 124 | 3 |  |  |
| 26.05 | Microbiological Sciences and Immunology | 9 | 92 | 92 | 95 | 6 |  | 66 |
| 26.07 | Zoology/Animal Biology | 6 | 29 | 29 | 18 |  |  |  |
| 26.08 | Genetics | 8 | 41 | 41 | 19 | 3 |  |  |
| 26.09 | Physiology, Pathology and Related Sciences | 13 | 178 | 178 | 159 | 5 |  | 113 |
| 26.10 | Pharmacology and Toxicology | 8 | 34 | 34 | 9 | 1 |  |  |
| 26.11 | Biomathematics, Bioinformatics, and Computational Biology | 5 | 55 | 55 | 107 | 4 |  |  |
| 26.12 | Biotechnology | 1 |  |  |  | 1 |  |  |
| 26.13 | Ecology, Evolution, Systematics, and Population Biology | 12 | 118 | 118 | 103 | 9 |  | 124 |
| 26.14 | Molecular Medicine | 1 | 13 | 13 | 3 |  |  |  |
| 26.15 | Neurobiology and Neurosciences | 5 | 59 | 56 | 31 | 3 | 9 | 169 |
| 26.99 | Biological and Biomedical Sciences, Other | 1 |  |  |  |  |  |  |
| 27.01 | Mathematics | 6 | 1,097 | 861 | 1,526 | 11 | 132 | 2,434 |
| 27.03 | Applied Mathematics | 6 | 15 | 10 | 15 | 1 | 14 |  |
| 27.05 | Statistics | 4 | 258 | 253 | 410 | 6 | 16 | 377 |
| 27.06 | Applied Statistics | 1 |  |  |  |  |  |  |
| 27.99 | Mathematics and Statistics, Other | 1 |  |  |  |  |  |  |
| 28.01 | Air Force ROTC, Air Science and Operations | 2 | 41 | 41 | 21 |  |  |  |
| 28.03 | Army ROTC, Military Science and Operations | 2 | 51 | 51 | 47 |  |  |  |
| 28.04 | Navy/Marine ROTC, Naval Science and Operations | 2 | 24 | 24 | 11 |  |  |  |
| 28.05 | Military Science and Operational Studies | 7 |  |  |  |  |  |  |
| 28.06 | Security Policy and Strategy | 6 |  |  |  |  |  |  |
| 28.07 | Military Economics and Management | 4 |  |  |  |  |  |  |
| 28.99 | Military Science, Leadership and Operational Art, Other | 1 |  |  |  |  |  |  |
| 29.02 | Intelligence, Command Control and Information Operations | 8 |  |  |  |  |  |  |
| 29.03 | Military Applied Sciences | 8 |  |  |  |  |  |  |
| 29.04 | Military Systems and Maintenance Technology | 10 |  |  |  |  |  |  |
| 29.06 | Military Technology and Applied Sciences Management | 1 |  |  |  |  |  |  |
| 29.99 | Military Technologies and Applied Sciences, Other | 1 |  |  |  |  |  |  |
| 30.00 | Multi-/Interdisciplinary Studies, General | 2 |  |  |  |  |  |  |
| 30.01 | Biological and Physical Sciences | 1 | 149 | 76 | 267 |  | 12 | 126 |
| 30.05 | Peace Studies and Conflict Resolution | 1 |  |  |  |  |  |  |
| 30.06 | Systems Science and Theory | 1 |  |  |  |  |  |  |
| 30.08 | Mathematics and Computer Science | 1 |  |  |  | 1 |  |  |
| 30.10 | Biopsychology | 1 |  |  |  |  |  |  |
| 30.11 | Gerontology | 1 | 50 | 50 | 10 |  |  |  |
| 30.12 | Historic Preservation and Conservation | 3 |  |  |  |  |  |  |
| 30.13 | Medieval and Renaissance Studies | 1 | 50 | 50 |  |  |  |  |
| 30.14 | Museology/Museum Studies | 1 | 42 | 38 | 16 |  | 1 |  |
| 30.15 | Science, Technology and Society | 1 |  |  |  |  |  |  |
| 30.16 | Accounting and Computer Science | 1 |  |  |  |  |  |  |
| 30.17 | Behavioral Sciences | 1 |  |  |  |  |  |  |
| 30.18 | Natural Sciences | 1 |  |  |  |  |  |  |
| 30.19 | Nutrition Sciences | 1 | 39 | 39 | 16 | 7 |  |  |
| 30.20 | International/Globalization Studies | 1 | 416 | 416 | 37 | 5 |  |  |
| 30.21 | Holocaust and Related Studies | 1 |  |  |  |  |  |  |
| 30.22 | Classical and Ancient Studies | 3 | 102 | 102 | 3 | 1 |  |  |
| 30.23 | Intercultural/Multicultural and Diversity Studies | 1 |  |  |  |  |  |  |
| 30.25 | Cognitive Science | 3 | 5 | 5 | 4 | 1 |  |  |
| 30.26 | Cultural Studies/Critical Theory and Analysis | 1 |  |  |  |  |  |  |
| 30.27 | Human Biology | 1 |  |  |  |  |  |  |
| 30.28 | Dispute Resolution | 1 |  |  |  |  |  |  |
| 30.29 | Maritime Studies | 1 |  |  |  |  |  |  |
| 30.30 | Computational Science | 1 |  |  |  |  |  |  |
| 30.31 | Human Computer Interaction | 1 | 20 | 20 | 4 |  |  |  |
| 30.32 | Marine Sciences | 1 |  |  |  |  |  |  |
| 30.33 | Sustainability Studies | 1 | 164 | 164 | 123 | 7 |  |  |
| 30.34 | Anthrozoology | 1 |  |  |  |  |  |  |
| 30.35 | Climate Science | 1 | 1 | 1 |  | 1 |  |  |
| 30.36 | Cultural Studies and Comparative Literature | 1 |  |  |  |  |  |  |
| 30.37 | Design for Human Health | 1 |  |  |  |  |  |  |
| 30.38 | Earth Systems Science | 1 |  |  |  |  |  |  |
| 30.39 | Economics and Computer Science | 1 |  |  |  |  |  |  |
| 30.40 | Economics and Foreign Language/Literature | 1 |  |  |  |  |  |  |
| 30.41 | Environmental Geosciences | 1 |  |  |  |  |  |  |
| 30.42 | Geoarcheaology | 1 |  |  |  |  |  |  |
| 30.43 | Geobiology | 1 |  |  |  |  |  |  |
| 30.44 | Geography and Environmental Studies | 1 |  |  |  |  |  |  |
| 30.45 | History and Language/Literature | 1 |  |  |  |  |  |  |
| 30.46 | History and Political Science | 1 |  |  |  |  |  |  |
| 30.47 | Linguistics and Anthropology | 1 |  |  |  |  |  |  |
| 30.48 | Linguistics and Computer Science | 1 |  |  |  |  |  |  |
| 30.49 | Mathematical Economics | 1 |  |  |  |  |  |  |
| 30.50 | Mathematics and Atmospheric/Oceanic Science | 1 |  |  |  |  |  |  |
| 30.51 | Philosophy, Politics, and Economics | 1 |  |  |  |  |  |  |
| 30.52 | Digital Humanities and Textual Studies | 4 |  |  |  |  |  |  |
| 30.53 | Thanatology | 1 |  |  |  |  |  |  |
| 30.70 | Data Science | 2 | 35 | 25 | 67 | 7 | 3 | 2,148 |
| 30.71 | Data Analytics | 5 |  |  |  | 1 |  |  |
| 30.99 | Multi/Interdisciplinary Studies, Other | 1 |  |  |  | 1 |  |  |
| 31.01 | Parks, Recreation, and Leisure Studies | 1 | 203 | 203 | 76 | 7 |  |  |
| 31.03 | Parks, Recreation, and Leisure Facilities Management | 3 |  |  |  |  |  |  |
| 31.05 | Sports, Kinesiology, and Physical Education/Fitness | 6 | 162 | 150 | 78 | 17 | 11 | 162 |
| 31.06 | Outdoor Education | 1 | 1 |  |  |  |  | 98 |
| 31.99 | Parks, Recreation, Leisure, Fitness, and Kinesiology, Other | 1 |  |  |  |  |  |  |
| 32.01 | Basic Skills and Developmental/Remedial Education | 10 | 68 | 36 | 26 |  | 17 | 177 |
| 32.02 | General Exam Preparation and Test-Taking Skills | 6 |  |  |  |  |  |  |
| 33.01 | Citizenship Activities | 7 | 22 | 9 | 3 |  | 6 | 4 |
| 34.01 | Health-Related Knowledge and Skills | 5 | 25 | 9 | 13 |  | 4 | 46 |
| 35.01 | Interpersonal and Social Skills | 5 |  |  |  |  |  | 32 |
| 36.01 | Leisure and Recreational Activities | 22 | 373 | 101 | 224 |  | 97 | 121 |
| 36.02 | Noncommercial Vehicle Operation | 7 | 37 | 10 | 20 |  | 10 |  |
| 37.01 | Personal Awareness and Self-Improvement | 7 | 14 | 3 | 8 |  | 6 | 441 |
| 38.00 | Philosophy and Religious Studies, General | 1 |  |  |  |  |  |  |
| 38.01 | Philosophy | 5 | 230 | 229 | 29 | 6 | 9 | 2,144 |
| 38.02 | Religion/Religious Studies | 10 | 355 | 311 | 65 | 5 | 16 | 90 |
| 38.99 | Philosophy and Religious Studies, Other | 1 |  |  |  |  |  |  |
| 39.02 | Bible/Biblical Studies | 1 |  |  |  |  |  |  |
| 39.03 | Missions/Missionary Studies and Missiology | 3 |  |  |  |  |  |  |
| 39.04 | Religious Education | 1 | 18 | 10 | 8 |  | 7 |  |
| 39.05 | Religious Music and Worship | 3 |  |  |  |  |  |  |
| 39.06 | Theological and Ministerial Studies | 5 | 27 | 3 | 17 |  | 18 |  |
| 39.07 | Pastoral Counseling and Specialized Ministries | 7 |  |  |  |  |  |  |
| 39.08 | Religious Institution Administration and Law | 3 |  |  |  |  |  |  |
| 39.99 | Theology and Religious Vocations, Other | 1 |  |  |  |  |  |  |
| 40.01 | Physical Sciences, General | 1 |  |  |  |  |  |  |
| 40.02 | Astronomy and Astrophysics | 4 | 104 | 101 | 100 | 8 | 10 | 78 |
| 40.04 | Atmospheric Sciences and Meteorology | 5 | 127 | 127 | 112 | 2 |  |  |
| 40.05 | Chemistry | 12 | 288 | 281 | 357 | 11 | 10 | 850 |
| 40.06 | Geological and Earth Sciences/Geosciences | 8 | 188 | 188 | 269 | 8 |  | 367 |
| 40.08 | Physics | 10 | 352 | 340 | 453 | 9 | 61 | 534 |
| 40.10 | Materials Sciences | 3 |  |  |  |  |  | 207 |
| 40.11 | Physics and Astronomy | 1 |  |  |  |  |  |  |
| 40.99 | Physical Sciences, Other | 1 |  |  |  |  |  |  |
| 41.00 | Science Technologies/Technicians, General | 1 |  |  |  |  |  |  |
| 41.01 | Biology/Biotechnology Technologies/Technicians | 1 |  |  |  |  |  |  |
| 41.02 | Nuclear and Industrial Radiologic Technologies/Technicians | 3 |  |  |  |  |  |  |
| 41.03 | Physical Science Technologies/Technicians | 3 |  |  |  |  |  |  |
| 41.99 | Science Technologies/Technicians, Other | 1 |  |  |  |  |  |  |
| 42.01 | Psychology, General | 1 | 635 | 622 | 429 | 8 | 23 | 279 |
| 42.27 | Research and Experimental Psychology | 11 |  |  |  |  |  |  |
| 42.28 | Clinical, Counseling and Applied Psychology | 18 | 83 | 82 | 51 | 2 |  |  |
| 42.99 | Psychology, Other | 1 |  |  |  |  |  |  |
| 43.01 | Criminal Justice and Corrections | 17 | 42 | 31 | 8 | 1 | 10 |  |
| 43.02 | Fire Protection | 7 | 23 |  | 10 |  | 9 |  |
| 43.03 | Homeland Security | 5 |  |  |  |  |  |  |
| 43.04 | Security Science and Technology | 9 |  |  |  |  |  |  |
| 43.99 | Homeland Security, Law Enforcement, Firefighting and Related Protective Services, Other | 1 |  |  |  |  |  |  |
| 44.00 | Human Services, General | 1 |  |  |  |  |  | 44 |
| 44.02 | Community Organization and Advocacy | 1 | 31 | 30 |  |  |  |  |
| 44.04 | Public Administration | 4 | 68 | 57 | 12 |  | 11 |  |
| 44.05 | Public Policy Analysis | 5 |  |  |  |  |  |  |
| 44.07 | Social Work | 4 | 231 | 217 | 233 | 5 | 11 |  |
| 44.99 | Public Administration and Social Service Professions, Other | 1 |  |  |  |  |  |  |
| 45.01 | Social Sciences, General | 4 | 1 |  |  |  |  |  |
| 45.02 | Anthropology | 6 | 335 | 330 | 123 | 8 | 11 | 115 |
| 45.03 | Archeology | 1 |  |  |  |  |  |  |
| 45.04 | Criminology | 1 | 57 | 57 | 36 | 2 |  |  |
| 45.05 | Demography | 3 |  |  |  |  |  |  |
| 45.06 | Economics | 6 | 361 | 350 | 500 | 8 | 40 | 578 |
| 45.07 | Geography and Cartography | 3 | 89 | 74 | 43 | 6 | 12 | 74 |
| 45.09 | International Relations and National Security Studies | 3 | 14 |  | 11 | 3 | 13 |  |
| 45.10 | Political Science and Government | 5 | 431 | 421 | 168 | 6 | 5 | 251 |
| 45.11 | Sociology | 4 | 265 | 258 | 107 | 5 | 6 | 306 |
| 45.12 | Urban Studies/Affairs | 1 |  |  |  |  |  |  |
| 45.13 | Sociology and Anthropology | 1 |  |  |  |  |  |  |
| 45.15 | Geography and Anthropology | 1 |  |  |  |  |  |  |
| 45.99 | Social Sciences, Other | 1 |  |  |  |  |  |  |
| 46.00 | Construction Trades, General | 1 | 33 | 7 | 21 |  | 4 | 5 |
| 46.01 | Mason/Masonry | 1 | 24 | 1 | 23 |  | 1 |  |
| 46.02 | Carpenters | 1 | 34 | 1 | 33 |  | 2 |  |
| 46.03 | Electrical and Power Transmission Installers | 4 | 64 | 15 | 44 |  | 11 |  |
| 46.04 | Building/Construction Finishing, Management, and Inspection | 13 | 17 | 8 | 5 |  |  |  |
| 46.05 | Plumbing and Related Water Supply Services | 5 | 45 | 1 | 43 |  | 3 |  |
| 46.99 | Construction Trades, Other | 1 |  |  |  |  |  |  |
| 47.00 | Mechanics and Repairers, General | 1 |  |  |  |  |  | 25 |
| 47.01 | Electrical/Electronics Maintenance and Repair Technologies/Technicians | 8 | 1 |  |  |  |  |  |
| 47.02 | Heating, Air Conditioning, Ventilation and Refrigeration Maintenance Technology/Technician (HAC, HACR, HVAC, HVACR) | 1 | 50 | 3 | 46 |  | 3 |  |
| 47.03 | Heavy/Industrial Equipment Maintenance Technologies/Technicians | 3 | 46 | 1 | 45 |  | 1 |  |
| 47.04 | Precision Systems Maintenance and Repair Technologies/Technicians | 6 |  |  |  |  |  |  |
| 47.06 | Vehicle Maintenance and Repair Technologies/Technicians | 18 | 87 | 44 | 55 |  | 10 |  |
| 47.07 | Energy Systems Maintenance and Repair Technologies/Technicians | 6 |  |  |  |  |  |  |
| 47.99 | Mechanic and Repair Technologies/Technicians, Other | 1 |  |  |  |  |  |  |
| 48.00 | Precision Production Trades, General | 1 |  |  |  |  |  | 35 |
| 48.03 | Leatherworking and Upholstery | 3 |  |  |  |  |  |  |
| 48.05 | Precision Metal Working | 9 | 50 | 9 | 35 |  | 10 |  |
| 48.07 | Woodworking | 5 | 7 |  | 6 |  | 4 |  |
| 48.08 | Boilermaking/Boilermaker | 1 |  |  |  |  |  |  |
| 48.99 | Precision Production, Other | 1 |  |  |  |  |  |  |
| 49.01 | Air Transportation | 8 | 35 | 21 | 14 |  | 12 |  |
| 49.02 | Ground Transportation | 7 | 38 | 2 | 29 |  | 1 |  |
| 49.03 | Marine Transportation | 4 | 10 | 6 | 1 |  | 2 |  |
| 49.99 | Transportation and Materials Moving, Other | 1 |  |  |  |  |  |  |
| 50.01 | Visual and Performing Arts, General | 2 | 45 | 15 | 42 |  | 6 |  |
| 50.02 | Crafts/Craft Design, Folk Art and Artisanry | 1 | 20 | 4 | 10 |  | 7 | 29 |
| 50.03 | Dance | 3 | 282 | 257 | 113 | 8 | 8 |  |
| 50.04 | Design and Applied Arts | 10 | 500 | 461 | 351 | 16 | 25 | 1,055 |
| 50.05 | Drama/Theatre Arts and Stagecraft | 11 | 361 | 344 | 216 | 12 | 19 | 28 |
| 50.06 | Film/Video and Photographic Arts | 5 | 244 | 228 | 253 | 6 | 21 | 91 |
| 50.07 | Fine and Studio Arts | 13 | 727 | 687 | 246 | 25 | 27 | 220 |
| 50.09 | Music | 17 | 1,102 | 980 | 446 | 21 | 51 | 462 |
| 50.10 | Arts, Entertainment, and Media Management | 5 | 4 | 1 | 2 |  | 1 |  |
| 50.11 | Community/Environmental/Socially-Engaged Art | 1 |  |  |  |  |  |  |
| 50.99 | Visual and Performing Arts, Other | 1 |  |  |  |  |  |  |
| 51.00 | Health Services/Allied Health/Health Sciences, General | 2 | 267 | 267 | 60 | 6 |  | 547 |
| 51.01 | Chiropractic | 1 | 81 | 53 | 27 |  |  |  |
| 51.02 | Communication Disorders Sciences and Services | 5 | 212 | 210 | 75 | 5 |  |  |
| 51.04 | Dentistry | 1 | 49 | 37 | 7 | 1 | 16 | 21 |
| 51.05 | Advanced/Graduate Dentistry and Oral Sciences | 15 | 167 | 167 | 77 | 5 |  |  |
| 51.06 | Dental Support Services and Allied Professions | 4 | 54 | 52 | 64 |  | 1 |  |
| 51.07 | Health and Medical Administrative Services | 24 | 61 | 55 | 32 | 4 | 3 |  |
| 51.08 | Allied Health and Medical Assisting Services | 14 | 15 | 9 | 1 |  | 2 |  |
| 51.09 | Allied Health Diagnostic, Intervention, and Treatment Professions | 24 | 334 | 282 | 275 | 11 | 22 |  |
| 51.10 | Clinical/Medical Laboratory Science/Research and Allied Professions | 13 | 8 |  |  | 1 | 1 |  |
| 51.11 | Health/Medical Preparatory Programs | 11 |  |  |  |  |  |  |
| 51.12 | Medicine | 4 | 336 | 299 | 94 | 2 | 30 | 343 |
| 51.14 | Medical Clinical Sciences/Graduate Medical Studies | 6 | 6 | 6 |  |  |  |  |
| 51.15 | Mental and Social Health Services and Allied Professions | 14 | 23 | 13 | 68 | 1 | 12 |  |
| 51.17 | Optometry | 1 | 2 | 1 |  |  |  |  |
| 51.18 | Ophthalmic and Optometric Support Services and Allied Professions | 5 |  |  |  |  |  |  |
| 51.20 | Pharmacy, Pharmaceutical Sciences, and Administration | 12 | 141 | 130 | 59 | 2 | 12 | 21 |
| 51.22 | Public Health | 13 | 139 | 127 | 68 | 17 | 6 | 80 |
| 51.23 | Rehabilitation and Therapeutic Professions | 17 | 155 | 127 | 63 | 4 | 23 |  |
| 51.26 | Health Aides/Attendants/Orderlies | 6 | 10 | 6 | 3 |  |  |  |
| 51.27 | Medical Illustration and Informatics | 3 |  |  |  |  |  |  |
| 51.31 | Dietetics and Clinical Nutrition Services | 5 | 53 | 40 | 16 | 7 | 10 |  |
| 51.32 | Health Professions Education, Ethics, and Humanities | 7 |  |  |  |  |  |  |
| 51.33 | Alternative and Complementary Medicine and Medical Systems | 8 |  |  |  |  |  |  |
| 51.34 | Alternative and Complementary Medical Support Services | 2 |  |  |  |  |  |  |
| 51.35 | Somatic Bodywork and Related Therapeutic Services | 4 | 4 | 3 |  |  | 2 |  |
| 51.36 | Movement and Mind-Body Therapies and Education | 4 | 8 |  | 4 |  | 4 |  |
| 51.37 | Energy and Biologically Based Therapies | 5 |  |  |  |  |  |  |
| 51.38 | Registered Nursing, Nursing Administration, Nursing Research and Clinical Nursing | 23 | 496 | 472 | 742 | 2 | 17 | 93 |
| 51.39 | Practical Nursing, Vocational Nursing and Nursing Assistants | 3 | 12 | 12 | 12 |  | 1 |  |
| 51.99 | Health Professions and Related Clinical Sciences, Other | 1 |  |  |  |  |  |  |
| 52.01 | Business/Commerce, General | 1 | 136 | 120 | 152 | 3 | 12 |  |
| 52.02 | Business Administration, Management and Operations | 17 | 534 | 446 | 169 | 13 | 16 | 3,867 |
| 52.03 | Accounting and Related Services | 6 | 198 | 174 | 198 | 6 | 11 | 224 |
| 52.04 | Business Operations Support and Assistant Services | 9 | 53 | 7 | 1 |  | 1 |  |
| 52.05 | Business/Corporate Communications | 3 |  |  |  |  |  |  |
| 52.06 | Business/Managerial Economics | 1 |  |  |  | 1 |  |  |
| 52.07 | Entrepreneurial and Small Business Operations | 5 | 102 | 102 | 58 | 5 |  | 185 |
| 52.08 | Finance and Financial Management Services | 9 | 312 | 285 | 247 | 7 | 17 | 1,146 |
| 52.09 | Hospitality Administration/Management | 10 | 189 | 176 | 77 | 5 | 7 | 59 |
| 52.10 | Human Resources Management and Services | 7 | 65 | 65 | 6 | 3 |  |  |
| 52.11 | International Business | 1 |  |  |  |  |  |  |
| 52.12 | Management Information Systems and Services | 4 | 133 | 133 | 112 | 4 |  |  |
| 52.13 | Management Sciences and Quantitative Methods | 4 | 142 | 132 | 131 | 7 | 4 |  |
| 52.14 | Marketing | 5 | 98 | 98 | 122 | 4 |  | 1,176 |
| 52.15 | Real Estate | 1 | 13 | 13 | 8 |  | 1 | 15 |
| 52.16 | Taxation | 1 |  |  |  |  |  |  |
| 52.17 | Insurance | 1 | 5 | 4 | 2 |  |  |  |
| 52.18 | General Sales, Merchandising and Related Marketing Operations | 5 | 27 | 7 | 6 |  | 4 |  |
| 52.19 | Specialized Sales, Merchandising and  Marketing Operations | 11 | 1 |  |  |  |  |  |
| 52.20 | Construction Management | 3 |  |  |  |  |  |  |
| 52.21 | Telecommunications Management | 1 |  |  |  |  |  |  |
| 52.99 | Business, Management, Marketing, and Related Support Services, Other | 1 |  |  |  |  |  |  |
| 53.01 | High School/Secondary Diploma Programs | 6 | 4 | 1 |  |  |  |  |
| 53.02 | High School/Secondary Certificate Programs | 4 |  |  |  |  |  |  |
| 54.01 | History | 9 | 571 | 560 | 56 | 7 | 21 | 325 |
| 60.01 | Dental Residency/Fellowship Programs | 11 |  |  |  |  |  |  |
| 60.03 | Veterinary Residency/Fellowship Programs | 21 |  |  |  |  |  |  |
| 60.07 | Nurse Practitioner Residency/Fellowship Programs | 52 |  |  |  |  |  |  |
| 60.08 | Pharmacy Residency/Fellowship Programs | 33 |  |  |  |  |  |  |
| 60.09 | Physician Assistant Residency/Fellowship Programs | 21 |  |  |  |  |  |  |
| 60.99 | Health Professions Residency/Fellowship Programs, Other | 1 |  |  |  |  |  |  |
| 61.01 | Combined Medical Residency/Fellowship Programs | 26 |  |  |  |  |  |  |
| 61.02 | Multiple-Pathway Medical Fellowship Programs | 18 |  |  |  |  |  |  |
| 61.03 | Allergy and Immunology Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.04 | Anesthesiology Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.05 | Dermatology Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.06 | Emergency Medicine Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.07 | Family Medicine Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.08 | Internal Medicine Residency/Fellowship Programs | 15 |  |  |  |  |  |  |
| 61.09 | Medical Genetics and Genomics Residency/Fellowship Programs | 5 |  |  |  |  |  |  |
| 61.10 | Neurological Surgery Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.11 | Neurology Residency/Fellowship Programs | 8 |  |  |  |  |  |  |
| 61.12 | Nuclear Medicine Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.13 | Obstetrics and Gynecology Residency/Fellowship Programs | 5 |  |  |  |  |  |  |
| 61.14 | Ophthalmology Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.15 | Orthopedic Surgery Residency/Fellowship Programs | 6 |  |  |  |  |  |  |
| 61.16 | Osteopathic Medicine Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.17 | Otolaryngology Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.18 | Pathology Residency/Fellowship Programs | 16 |  |  |  |  |  |  |
| 61.19 | Pediatrics Residency/Fellowship Programs | 17 |  |  |  |  |  |  |
| 61.20 | Physical Medicine and Rehabilitation Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.21 | Plastic Surgery Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.22 | Podiatric Medicine Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.23 | Preventive Medicine Residency/Fellowship Programs | 4 |  |  |  |  |  |  |
| 61.24 | Psychiatry Residency/Fellowship Programs | 7 |  |  |  |  |  |  |
| 61.25 | Radiation Oncology Residency/Fellowship Programs | 2 |  |  |  |  |  |  |
| 61.26 | Radiology Residency/Fellowship Programs | 13 |  |  |  |  |  |  |
| 61.27 | Surgery Residency/Fellowship Programs | 9 |  |  |  |  |  |  |
| 61.28 | Urology Residency/Fellowship Programs | 3 |  |  |  |  |  |  |
| 61.99 | Medical Residency/Fellowship Programs, Other | 1 |  |  |  |  |  |  |

## Four-Digit Families with Nothing

209 families hold no row, program, book or resource. Sorted by the count of six-digit programs in use.

| Code | Family | CIP programs |
|---|---|---|
| 60.07 | Nurse Practitioner Residency/Fellowship Programs | 52 |
| 60.08 | Pharmacy Residency/Fellowship Programs | 33 |
| 61.01 | Combined Medical Residency/Fellowship Programs | 26 |
| 22.02 | Legal Research and Advanced Professional Studies | 25 |
| 60.03 | Veterinary Residency/Fellowship Programs | 21 |
| 60.09 | Physician Assistant Residency/Fellowship Programs | 21 |
| 61.02 | Multiple-Pathway Medical Fellowship Programs | 18 |
| 61.19 | Pediatrics Residency/Fellowship Programs | 17 |
| 61.18 | Pathology Residency/Fellowship Programs | 16 |
| 61.08 | Internal Medicine Residency/Fellowship Programs | 15 |
| 61.26 | Radiology Residency/Fellowship Programs | 13 |
| 42.27 | Research and Experimental Psychology | 11 |
| 51.11 | Health/Medical Preparatory Programs | 11 |
| 60.01 | Dental Residency/Fellowship Programs | 11 |
| 29.04 | Military Systems and Maintenance Technology | 10 |
| 43.04 | Security Science and Technology | 9 |
| 61.27 | Surgery Residency/Fellowship Programs | 9 |
| 29.02 | Intelligence, Command Control and Information Operations | 8 |
| 29.03 | Military Applied Sciences | 8 |
| 51.33 | Alternative and Complementary Medicine and Medical Systems | 8 |
| 61.11 | Neurology Residency/Fellowship Programs | 8 |
| 15.04 | Electromechanical Technologies/Technicians | 7 |
| 28.05 | Military Science and Operational Studies | 7 |
| 39.07 | Pastoral Counseling and Specialized Ministries | 7 |
| 51.32 | Health Professions Education, Ethics, and Humanities | 7 |
| 61.24 | Psychiatry Residency/Fellowship Programs | 7 |
| 01.05 | Agricultural and Domestic Animal Services | 6 |
| 15.07 | Quality Control and Safety Technologies/Technicians | 6 |
| 19.09 | Apparel and Textiles | 6 |
| 28.06 | Security Policy and Strategy | 6 |
| 32.02 | General Exam Preparation and Test-Taking Skills | 6 |
| 47.04 | Precision Systems Maintenance and Repair Technologies/Technicians | 6 |
| 47.07 | Energy Systems Maintenance and Repair Technologies/Technicians | 6 |
| 61.15 | Orthopedic Surgery Residency/Fellowship Programs | 6 |
| 01.82 | Veterinary Administrative Services | 5 |
| 15.05 | Environmental Control Technologies/Technicians | 5 |
| 15.12 | Computer Engineering Technologies/Technicians | 5 |
| 43.03 | Homeland Security | 5 |
| 44.05 | Public Policy Analysis | 5 |
| 51.18 | Ophthalmic and Optometric Support Services and Allied Professions | 5 |
| 51.37 | Energy and Biologically Based Therapies | 5 |
| 61.09 | Medical Genetics and Genomics Residency/Fellowship Programs | 5 |
| 61.13 | Obstetrics and Gynecology Residency/Fellowship Programs | 5 |
| 04.04 | Environmental Design | 4 |
| 13.02 | Bilingual, Multilingual, and Multicultural Education | 4 |
| 15.15 | Engineering-Related Fields | 4 |
| 19.02 | Family and Consumer Sciences/Human Sciences Business Services | 4 |
| 19.06 | Housing and Human Environments | 4 |
| 28.07 | Military Economics and Management | 4 |
| 30.52 | Digital Humanities and Textual Studies | 4 |
| 53.02 | High School/Secondary Certificate Programs | 4 |
| 61.05 | Dermatology Residency/Fellowship Programs | 4 |
| 61.06 | Emergency Medicine Residency/Fellowship Programs | 4 |
| 61.17 | Otolaryngology Residency/Fellowship Programs | 4 |
| 61.20 | Physical Medicine and Rehabilitation Residency/Fellowship Programs | 4 |
| 61.21 | Plastic Surgery Residency/Fellowship Programs | 4 |
| 61.23 | Preventive Medicine Residency/Fellowship Programs | 4 |
| 04.09 | Architectural Sciences and Technology | 3 |
| 11.06 | Data Entry/Microcomputer Applications | 3 |
| 13.15 | Teaching Assistants/Aides | 3 |
| 15.09 | Mining and Petroleum Technologies/Technicians | 3 |
| 15.11 | Engineering-Related Technologies/Technicians | 3 |
| 22.00 | Non-Professional Legal Studies | 3 |
| 30.12 | Historic Preservation and Conservation | 3 |
| 31.03 | Parks, Recreation, and Leisure Facilities Management | 3 |
| 39.03 | Missions/Missionary Studies and Missiology | 3 |
| 39.05 | Religious Music and Worship | 3 |
| 39.08 | Religious Institution Administration and Law | 3 |
| 41.02 | Nuclear and Industrial Radiologic Technologies/Technicians | 3 |
| 41.03 | Physical Science Technologies/Technicians | 3 |
| 45.05 | Demography | 3 |
| 48.03 | Leatherworking and Upholstery | 3 |
| 51.27 | Medical Illustration and Informatics | 3 |
| 52.05 | Business/Corporate Communications | 3 |
| 52.20 | Construction Management | 3 |
| 61.28 | Urology Residency/Fellowship Programs | 3 |
| 01.13 | Agriculture/Veterinary Preparatory Programs | 2 |
| 30.00 | Multi-/Interdisciplinary Studies, General | 2 |
| 51.34 | Alternative and Complementary Medical Support Services | 2 |
| 61.03 | Allergy and Immunology Residency/Fellowship Programs | 2 |
| 61.04 | Anesthesiology Residency/Fellowship Programs | 2 |
| 61.07 | Family Medicine Residency/Fellowship Programs | 2 |
| 61.10 | Neurological Surgery Residency/Fellowship Programs | 2 |
| 61.12 | Nuclear Medicine Residency/Fellowship Programs | 2 |
| 61.14 | Ophthalmology Residency/Fellowship Programs | 2 |
| 61.16 | Osteopathic Medicine Residency/Fellowship Programs | 2 |
| 61.22 | Podiatric Medicine Residency/Fellowship Programs | 2 |
| 61.25 | Radiation Oncology Residency/Fellowship Programs | 2 |
| 01.99 | Agricultural/Animal/Plant/Veterinary Science and Related Fields, Other | 1 |
| 03.06 | Wildlife and Wildlands Science and Management | 1 |
| 03.99 | Natural Resources and Conservation, Other | 1 |
| 04.05 | Interior Architecture | 1 |
| 04.10 | Real Estate Development | 1 |
| 04.99 | Architecture and Related Services, Other | 1 |
| 05.99 | Area, Ethnic, Cultural, Gender, and Group Studies, Other | 1 |
| 09.10 | Publishing | 1 |
| 09.99 | Communication, Journalism, and Related Programs, Other | 1 |
| 10.01 | Communications Technologies/Technicians | 1 |
| 10.99 | Communications Technologies/Technicians and Support Services, Other | 1 |
| 11.03 | Data Processing | 1 |
| 11.05 | Computer Systems Analysis | 1 |
| 11.99 | Computer and Information Sciences and Support Services, Other | 1 |
| 13.07 | International and Comparative Education | 1 |
| 13.09 | Social and Philosophical Foundations of Education | 1 |
| 14.04 | Architectural Engineering | 1 |
| 14.12 | Engineering Physics | 1 |
| 14.13 | Engineering Science | 1 |
| 14.20 | Metallurgical Engineering | 1 |
| 14.22 | Naval Architecture and Marine Engineering | 1 |
| 14.25 | Petroleum Engineering | 1 |
| 14.32 | Polymer/Plastics Engineering | 1 |
| 14.34 | Forest Engineering | 1 |
| 14.36 | Manufacturing Engineering | 1 |
| 14.37 | Operations Research | 1 |
| 14.38 | Surveying Engineering | 1 |
| 14.39 | Geological/Geophysical Engineering | 1 |
| 14.40 | Paper Science and Engineering | 1 |
| 14.41 | Electromechanical Engineering | 1 |
| 14.42 | Mechatronics, Robotics, and Automation Engineering | 1 |
| 14.43 | Biochemical Engineering | 1 |
| 14.44 | Engineering Chemistry | 1 |
| 14.45 | Biological/Biosystems Engineering | 1 |
| 14.47 | Electrical and Computer Engineering | 1 |
| 15.01 | Architectural Engineering Technologies/Technicians | 1 |
| 15.10 | Construction Engineering Technology/Technician | 1 |
| 15.14 | Nuclear Engineering Technology/Technician | 1 |
| 15.16 | Nanotechnology | 1 |
| 15.99 | Engineering/Engineering-Related Technologies/Technicians, Other | 1 |
| 16.08 | Iranian/Persian Languages, Literatures, and Linguistics | 1 |
| 16.13 | Celtic Languages, Literatures, and Linguistics | 1 |
| 16.18 | Armenian Languages, Literatures, and Linguistics | 1 |
| 16.99 | Foreign Languages, Literatures, and Linguistics, Other | 1 |
| 19.10 | Work and Family Studies | 1 |
| 19.99 | Family and Consumer Sciences/Human Sciences, Other | 1 |
| 23.99 | English Language and Literature/Letters, Other | 1 |
| 25.03 | Library and Archives Assisting | 1 |
| 25.99 | Library Science, Other | 1 |
| 26.99 | Biological and Biomedical Sciences, Other | 1 |
| 27.06 | Applied Statistics | 1 |
| 27.99 | Mathematics and Statistics, Other | 1 |
| 28.99 | Military Science, Leadership and Operational Art, Other | 1 |
| 29.06 | Military Technology and Applied Sciences Management | 1 |
| 29.99 | Military Technologies and Applied Sciences, Other | 1 |
| 30.05 | Peace Studies and Conflict Resolution | 1 |
| 30.06 | Systems Science and Theory | 1 |
| 30.10 | Biopsychology | 1 |
| 30.15 | Science, Technology and Society | 1 |
| 30.16 | Accounting and Computer Science | 1 |
| 30.17 | Behavioral Sciences | 1 |
| 30.18 | Natural Sciences | 1 |
| 30.21 | Holocaust and Related Studies | 1 |
| 30.23 | Intercultural/Multicultural and Diversity Studies | 1 |
| 30.26 | Cultural Studies/Critical Theory and Analysis | 1 |
| 30.27 | Human Biology | 1 |
| 30.28 | Dispute Resolution | 1 |
| 30.29 | Maritime Studies | 1 |
| 30.30 | Computational Science | 1 |
| 30.32 | Marine Sciences | 1 |
| 30.34 | Anthrozoology | 1 |
| 30.36 | Cultural Studies and Comparative Literature | 1 |
| 30.37 | Design for Human Health | 1 |
| 30.38 | Earth Systems Science | 1 |
| 30.39 | Economics and Computer Science | 1 |
| 30.40 | Economics and Foreign Language/Literature | 1 |
| 30.41 | Environmental Geosciences | 1 |
| 30.42 | Geoarcheaology | 1 |
| 30.43 | Geobiology | 1 |
| 30.44 | Geography and Environmental Studies | 1 |
| 30.45 | History and Language/Literature | 1 |
| 30.46 | History and Political Science | 1 |
| 30.47 | Linguistics and Anthropology | 1 |
| 30.48 | Linguistics and Computer Science | 1 |
| 30.49 | Mathematical Economics | 1 |
| 30.50 | Mathematics and Atmospheric/Oceanic Science | 1 |
| 30.51 | Philosophy, Politics, and Economics | 1 |
| 30.53 | Thanatology | 1 |
| 31.99 | Parks, Recreation, Leisure, Fitness, and Kinesiology, Other | 1 |
| 38.00 | Philosophy and Religious Studies, General | 1 |
| 38.99 | Philosophy and Religious Studies, Other | 1 |
| 39.02 | Bible/Biblical Studies | 1 |
| 39.99 | Theology and Religious Vocations, Other | 1 |
| 40.01 | Physical Sciences, General | 1 |
| 40.11 | Physics and Astronomy | 1 |
| 40.99 | Physical Sciences, Other | 1 |
| 41.00 | Science Technologies/Technicians, General | 1 |
| 41.01 | Biology/Biotechnology Technologies/Technicians | 1 |
| 41.99 | Science Technologies/Technicians, Other | 1 |
| 42.99 | Psychology, Other | 1 |
| 43.99 | Homeland Security, Law Enforcement, Firefighting and Related Protective Services, Other | 1 |
| 44.99 | Public Administration and Social Service Professions, Other | 1 |
| 45.03 | Archeology | 1 |
| 45.12 | Urban Studies/Affairs | 1 |
| 45.13 | Sociology and Anthropology | 1 |
| 45.15 | Geography and Anthropology | 1 |
| 45.99 | Social Sciences, Other | 1 |
| 46.99 | Construction Trades, Other | 1 |
| 47.99 | Mechanic and Repair Technologies/Technicians, Other | 1 |
| 48.08 | Boilermaking/Boilermaker | 1 |
| 48.99 | Precision Production, Other | 1 |
| 49.99 | Transportation and Materials Moving, Other | 1 |
| 50.11 | Community/Environmental/Socially-Engaged Art | 1 |
| 50.99 | Visual and Performing Arts, Other | 1 |
| 51.99 | Health Professions and Related Clinical Sciences, Other | 1 |
| 52.11 | International Business | 1 |
| 52.16 | Taxation | 1 |
| 52.21 | Telecommunications Management | 1 |
| 52.99 | Business, Management, Marketing, and Related Support Services, Other | 1 |
| 60.99 | Health Professions Residency/Fellowship Programs, Other | 1 |
| 61.99 | Medical Residency/Fellowship Programs, Other | 1 |

## Codes Outside the Families in Use

1 four-digit codes hold items and sit outside the 457 families in use, because CIP 2020 moved or reserved them. They add to the 248 covered families for a total of 249 codes touched.

| Code | Title | CIP 2020 action | Rows | Programs | Books | Resources |
|---|---|---|---|---|---|---|
| 19.00 | Work and Family Studies | Moved from |  |  |  | 39 |

## SOC Minor Groups

Occupations counts SOC detailed occupations, then O*NET 31.0 occupations.

| Code | Minor group | Occupations | Rows | Verified | Edges | Programs | Books | Resources |
|---|---|---|---|---|---|---|---|---|
| 11-1000 | Top Executives | 3 / 4 | 9 | 5 |  | 23 | 52 | 5,198 |
| 11-2000 | Advertising, Marketing, Promotions, Public Relations, and Sales Managers | 5 / 5 | 14 | 1 | 2 | 30 | 44 | 5,636 |
| 11-3000 | Operations Specialties Managers | 10 / 19 | 19 |  |  | 72 | 124 | 16,027 |
| 11-9000 | Other Management Occupations | 20 / 31 | 42 | 2 | 2 | 363 | 605 | 21,351 |
| 13-1000 | Business Operations Specialists | 20 / 33 | 24 | 9 | 6 | 62 | 145 | 9,100 |
| 13-2000 | Financial Specialists | 15 / 17 | 52 | 19 | 26 | 30 | 105 | 5,472 |
| 15-1200 | Computer Occupations | 15 / 28 | 80 | 43 | 40 | 61 | 88 | 20,989 |
| 15-2000 | Mathematical Science Occupations | 6 / 10 | 36 | 6 | 23 | 54 | 297 | 20,283 |
| 17-1000 | Architects, Surveyors, and Cartographers | 4 / 5 | 41 | 26 | 25 | 10 | 58 | 392 |
| 17-2000 | Engineers | 18 / 35 | 11 | 8 | 3 | 92 | 16 | 3,003 |
| 17-3000 | Drafters, Engineering Technicians, and Mapping Technicians | 14 / 19 | 4 |  |  | 6 | 14 | 373 |
| 19-1000 | Life Scientists | 12 / 18 | 8 |  | 1 | 130 | 95 | 1,392 |
| 19-2000 | Physical Scientists | 9 / 13 | 1 |  | 1 | 56 | 105 | 2,137 |
| 19-3000 | Social Scientists and Related Workers | 13 / 17 | 12 | 2 | 6 | 89 | 178 | 4,914 |
| 19-4000 | Life, Physical, and Social Science Technicians | 12 / 16 |  |  |  | 152 | 190 | 3,951 |
| 19-5000 | Occupational Health and Safety Specialists and Technicians | 2 / 2 |  |  |  | 2 | 20 | 80 |
| 21-1000 | Counselors, Social Workers, and Other Community and Social Service Specialists | 15 / 15 | 13 | 8 | 4 | 29 | 43 | 671 |
| 21-2000 | Religious Workers | 3 / 3 | 19 | 7 | 12 |  | 25 |  |
| 23-1000 | Lawyers, Judges, and Related Workers | 5 / 5 | 50 | 25 | 75 | 6 | 32 | 316 |
| 23-2000 | Legal Support Workers | 3 / 3 | 5 | 4 | 1 |  | 1 |  |
| 25-1000 | Postsecondary Teachers | 37 / 37 | 8 | 7 | 5 | 727 | 1,267 | 44,264 |
| 25-2000 | Preschool, Elementary, Middle, Secondary, and Special Education Teachers | 13 / 14 | 13 | 1 | 5 | 146 | 388 | 7,434 |
| 25-3000 | Other Teachers and Instructors | 5 / 5 |  |  |  |  | 4 |  |
| 25-4000 | Librarians, Curators, and Archivists | 5 / 5 |  |  |  | 8 | 45 | 678 |
| 25-9000 | Other Educational Instruction and Library Occupations | 7 / 7 |  |  |  | 44 | 51 | 562 |
| 27-1000 | Art and Design Workers | 13 / 13 | 17 | 8 | 10 | 34 | 71 | 3,290 |
| 27-2000 | Entertainers and Performers, Sports and Related Workers | 11 / 14 | 22 | 5 | 14 | 47 | 94 | 743 |
| 27-3000 | Media and Communication Workers | 9 / 10 | 18 | 3 | 4 | 54 | 125 | 2,963 |
| 27-4000 | Media and Communication Equipment Workers | 8 / 8 | 9 | 2 | 5 | 12 | 58 | 1,828 |
| 29-1000 | Healthcare Diagnosing or Treating Practitioners | 45 / 61 | 382 | 226 | 200 | 54 | 170 | 889 |
| 29-2000 | Health Technologists and Technicians | 22 / 29 | 31 | 6 | 8 | 24 | 30 | 127 |
| 29-9000 | Other Healthcare Practitioners and Technical Occupations | 5 / 6 |  |  |  | 4 | 23 | 242 |
| 31-1100 | Home Health and Personal Care Aides; and Nursing Assistants, Orderlies, and Psychiatric Aides | 5 / 5 | 21 | 16 | 15 |  | 1 |  |
| 31-2000 | Occupational Therapy and Physical Therapist Assistants and Aides | 4 / 4 | 4 |  |  |  |  |  |
| 31-9000 | Other Healthcare Support Occupations | 9 / 11 | 36 | 21 | 5 |  | 5 |  |
| 33-1000 | Supervisors of Protective Service Workers | 5 / 5 | 2 |  |  | 1 | 19 |  |
| 33-2000 | Firefighting and Prevention Workers | 3 / 3 | 13 |  | 3 |  | 9 |  |
| 33-3000 | Law Enforcement Workers | 7 / 10 | 9 |  | 3 |  | 10 |  |
| 33-9000 | Other Protective Service Workers | 9 / 10 | 15 | 5 | 3 |  | 10 |  |
| 35-1000 | Supervisors of Food Preparation and Serving Workers | 2 / 2 | 34 | 23 | 18 |  | 9 | 192 |
| 35-2000 | Cooks and Food Preparation Workers | 7 / 7 | 5 |  |  |  | 9 | 192 |
| 35-3000 | Food and Beverage Serving Workers | 4 / 5 | 5 |  |  |  |  | 65 |
| 35-9000 | Other Food Preparation and Serving Related Workers | 4 / 4 | 3 |  |  |  |  |  |
| 37-1000 | Supervisors of Building and Grounds Cleaning and Maintenance Workers | 2 / 2 | 2 |  |  |  | 6 |  |
| 37-2000 | Building Cleaning and Pest Control Workers | 4 / 4 | 23 | 17 | 10 |  |  |  |
| 37-3000 | Grounds Maintenance Workers | 4 / 4 | 9 | 4 | 2 |  | 6 |  |
| 39-1000 | Supervisors of Personal Care and Service Workers | 3 / 3 | 2 |  |  |  | 7 | 157 |
| 39-2000 | Animal Care and Service Workers | 2 / 2 | 2 |  |  |  |  |  |
| 39-3000 | Entertainment Attendants and Related Workers | 9 / 9 | 7 |  |  |  | 14 | 28 |
| 39-4000 | Funeral Service Workers | 4 / 4 | 2 |  |  |  |  |  |
| 39-5000 | Personal Appearance Workers | 6 / 6 | 5 |  |  |  | 1 |  |
| 39-6000 | Baggage Porters, Bellhops, and Concierges | 2 / 2 | 2 |  |  |  |  |  |
| 39-7000 | Tour and Travel Guides | 2 / 2 | 1 |  |  | 7 | 28 | 384 |
| 39-9000 | Other Personal Care and Service Workers | 5 / 6 | 2 |  |  |  | 9 | 260 |
| 41-1000 | Supervisors of Sales Workers | 2 / 2 | 2 |  |  |  | 22 | 3,867 |
| 41-2000 | Retail Sales Workers | 5 / 5 | 6 | 1 |  |  | 4 |  |
| 41-3000 | Sales Representatives, Services | 5 / 5 | 24 | 18 | 7 | 1 | 21 | 1,146 |
| 41-4000 | Sales Representatives, Wholesale and Manufacturing | 2 / 3 | 4 | 1 |  |  | 4 |  |
| 41-9000 | Other Sales and Related Workers | 8 / 8 | 21 | 13 | 8 |  | 5 | 15 |
| 43-1000 | Supervisors of Office and Administrative Support Workers | 1 / 1 | 1 |  |  |  | 13 | 3,867 |
| 43-2000 | Communications Equipment Operators | 3 / 3 | 3 |  |  |  |  |  |
| 43-3000 | Financial Clerks | 8 / 8 | 19 | 11 | 6 |  | 19 | 1,370 |
| 43-4000 | Information and Record Clerks | 17 / 17 | 17 |  |  | 3 | 19 | 1,370 |
| 43-5000 | Material Recording, Scheduling, Dispatching, and Distributing Workers | 11 / 12 | 15 | 1 |  |  | 1 |  |
| 43-6000 | Secretaries and Administrative Assistants | 4 / 4 | 5 |  |  |  | 1 |  |
| 43-9000 | Other Office and Administrative Support Workers | 10 / 10 | 11 | 1 |  | 17 | 27 | 592 |
| 45-1000 | Supervisors of Farming, Fishing, and Forestry Workers | 1 / 1 | 1 |  |  | 19 | 16 |  |
| 45-2000 | Agricultural Workers | 7 / 7 | 7 |  |  |  | 2 |  |
| 45-3000 | Fishing and Hunting Workers | 1 / 1 | 5 | 2 |  |  |  |  |
| 45-4000 | Forest, Conservation, and Logging Workers | 5 / 5 | 7 | 2 |  | 4 | 15 |  |
| 47-1000 | Supervisors of Construction and Extraction Workers | 1 / 2 |  |  |  |  | 20 | 5 |
| 47-2000 | Construction Trades Workers | 30 / 31 | 225 | 26 | 185 |  | 18 |  |
| 47-3000 | Helpers, Construction Trades | 7 / 7 |  |  |  |  |  |  |
| 47-4000 | Other Construction and Related Workers | 9 / 11 |  |  |  |  | 5 |  |
| 47-5000 | Extraction Workers | 14 / 14 |  |  |  |  | 1 |  |
| 49-1000 | Supervisors of Installation, Maintenance, and Repair Workers | 1 / 1 |  |  |  | 1 | 13 | 3,892 |
| 49-2000 | Electrical and Electronic Equipment Mechanics, Installers, and Repairers | 11 / 11 |  |  |  |  | 14 | 193 |
| 49-3000 | Vehicle and Mobile Equipment Mechanics, Installers, and Repairers | 14 / 14 | 87 | 44 | 55 |  | 10 |  |
| 49-9000 | Other Installation, Maintenance, and Repair Occupations | 25 / 26 | 101 | 4 | 92 |  | 15 | 25 |
| 51-1000 | Supervisors of Production Workers | 1 / 1 |  |  |  | 1 | 12 | 3,867 |
| 51-2000 | Assemblers and Fabricators | 10 / 10 |  |  |  |  | 5 |  |
| 51-3000 | Food Processing Workers | 8 / 8 |  |  |  |  |  | 65 |
| 51-4000 | Metal Workers and Plastic Workers | 24 / 24 | 46 | 6 | 34 |  | 10 |  |
| 51-5100 | Printing Workers | 3 / 3 |  |  |  |  |  |  |
| 51-6000 | Textile, Apparel, and Furnishings Workers | 15 / 15 |  |  |  |  |  |  |
| 51-7000 | Woodworkers | 7 / 7 |  |  |  |  | 4 |  |
| 51-8000 | Plant and System Operators | 9 / 12 |  |  |  |  |  |  |
| 51-9000 | Other Production Occupations | 30 / 34 | 4 | 3 | 1 |  | 2 | 220 |
| 53-1000 | Supervisors of Transportation and Material Moving Workers | 5 / 6 |  |  |  |  | 4 |  |
| 53-2000 | Air Transportation Workers | 5 / 5 | 35 | 21 | 14 |  | 12 |  |
| 53-3000 | Motor Vehicle Operators | 9 / 9 | 9 | 1 | 6 |  |  |  |
| 53-4000 | Rail Transportation Workers | 6 / 6 | 3 |  | 1 |  |  |  |
| 53-5000 | Water Transportation Workers | 4 / 4 | 6 | 4 | 1 |  | 2 |  |
| 53-6000 | Other Transportation Workers | 8 / 10 |  |  |  |  | 11 |  |
| 53-7000 | Material Moving Workers | 16 / 17 |  |  |  |  | 1 |  |
| 55-1000 | Military Officer Special and Tactical Operations Leaders | 8 / 8 | 13 |  | 9 |  |  |  |
| 55-2000 | First-Line Enlisted Military Supervisors | 3 / 3 |  |  |  |  |  |  |
| 55-3000 | Military Enlisted Tactical Operations and Air/Weapons Specialists and Crew Members | 8 / 8 | 1 | 1 |  |  |  |  |

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
| 51-5100 | Printing Workers | 3 | no |
| 51-6000 | Textile, Apparel, and Furnishings Workers | 15 | no |
| 51-7000 | Woodworkers | 7 | yes |
| 51-8000 | Plant and System Operators | 9 | no |
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
| frameworks | 0 |
| progression | 0 |
| assessments | 0 |
| courses | 504 |
| books | 0 |
| resources | 5,471 |
| programs | 246 |
