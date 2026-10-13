# Threshold Tables

Written by `python3 thresholds.py`. Every figure in `THRESHOLDS.md` comes from `thresholds.json`, which holds the same numbers.

## Reach Quantile Sweep

| quantile | tau | inside | outside | reachable | beyond | unsampled | rows changing zone | branch rank correlation | growth top 20 kept | edge top 20 kept |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.010 | 0.648 | 4,946 | 263 | 3,252 | 263 | 0 | 818 | 0.952 | 2 | 0 |
| 0.020 | 0.670 | 4,806 | 403 | 3,112 | 403 | 0 | 678 | 0.905 | 6 | 0 |
| 0.050 | 0.708 | 4,519 | 690 | 2,825 | 690 | 0 | 391 | 0.976 | 14 | 0 |
| 0.075 | 0.732 | 4,371 | 838 | 2,677 | 838 | 0 | 243 | 1.000 | 15 | 0 |
| 0.100 | 0.762 | 4,128 | 1,081 | 2,434 | 1,081 | 0 | 0 | 1.000 | 20 | 20 |
| 0.125 | 0.780 | 3,937 | 1,272 | 2,243 | 1,272 | 0 | 191 | 0.970 | 14 | 0 |
| 0.150 | 0.790 | 3,788 | 1,421 | 2,094 | 1,421 | 0 | 340 | 0.927 | 6 | 0 |
| 0.200 | 0.811 | 3,380 | 1,829 | 1,686 | 1,829 | 0 | 748 | 0.927 | 1 | 0 |
| 0.250 | 0.824 | 3,005 | 2,204 | 1,311 | 2,204 | 0 | 1,123 | 0.927 | 0 | 0 |
| 0.300 | 0.834 | 2,737 | 2,472 | 1,043 | 2,472 | 0 | 1,391 | 0.927 | 0 | 0 |
| 0.400 | 0.850 | 2,345 | 2,864 | 651 | 2,864 | 0 | 1,783 | 0.873 | 0 | 0 |
| 0.500 | 0.864 | 2,114 | 3,095 | 420 | 3,095 | 0 | 2,014 | 0.873 | 0 | 0 |

## Minimum Solved Per Branch Sweep

| minimum | tau | inside | outside | reachable | beyond | unsampled | rows changing zone | branch rank correlation | growth top 20 kept | edge top 20 kept | unsampled branches |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.762 | 4,128 | 1,081 | 2,434 | 1,081 | 0 | 0 | 1.000 | 20 | 20 | none |
| 5 | 0.762 | 4,128 | 1,081 | 2,434 | 1,081 | 0 | 0 | 1.000 | 20 | 20 | none |
| 10 | 0.762 | 4,128 | 1,081 | 2,434 | 1,081 | 0 | 0 | 1.000 | 20 | 20 | none |
| 11 | 0.762 | 4,128 | 1,081 | 2,434 | 952 | 129 | 129 | 1.000 | 3 | 20 | mind |
| 15 | 0.762 | 4,128 | 1,081 | 2,434 | 952 | 129 | 129 | 1.000 | 3 | 20 | mind |
| 20 | 0.762 | 4,128 | 1,081 | 2,434 | 952 | 129 | 129 | 1.000 | 3 | 20 | mind |
| 25 | 0.762 | 4,123 | 1,086 | 2,429 | 875 | 211 | 211 | 1.000 | 1 | 20 | chemistry, mind |
| 30 | 0.762 | 4,119 | 1,090 | 2,425 | 768 | 322 | 322 | 1.000 | 1 | 20 | chemistry, cosmology, mind |
| 35 | 0.762 | 4,114 | 1,095 | 2,420 | 536 | 559 | 559 | 1.000 | 1 | 18 | applied, biophysics, chemistry, cosmology, mind |
| 45 | 0.762 | 4,082 | 1,127 | 2,388 | 472 | 655 | 655 | n/a | 1 | 18 | applied, biophysics, chemistry, cosmology, information, mind |
| 60 | 0.762 | 4,044 | 1,165 | 2,350 | 287 | 878 | 878 | n/a | 0 | 18 | applied, biophysics, chemistry, cosmology, information, mind, physics |
| 100 | 0.762 | 4,044 | 1,165 | 2,350 | 287 | 878 | 878 | n/a | 0 | 18 | applied, biophysics, chemistry, cosmology, information, mind, physics |

## Ring Radius Sweep

| core | outer | rank correlation of radius with 1 - reach | inverted pair share | disc area inside frontier | disc area in core | rows changing zone |
|---|---|---|---|---|---|---|
| 0.300 | 1.250 | 0.848 | 0.102 | 0.640 | 0.058 | 0 |
| 0.300 | 1.500 | 0.848 | 0.102 | 0.444 | 0.040 | 0 |
| 0.300 | 2.000 | 0.848 | 0.102 | 0.250 | 0.022 | 0 |
| 0.400 | 1.250 | 0.848 | 0.102 | 0.640 | 0.102 | 0 |
| 0.400 | 1.500 | 0.848 | 0.102 | 0.444 | 0.071 | 0 |
| 0.400 | 2.000 | 0.848 | 0.102 | 0.250 | 0.040 | 0 |
| 0.500 | 1.250 | 0.848 | 0.102 | 0.640 | 0.160 | 0 |
| 0.500 | 1.500 | 0.848 | 0.102 | 0.444 | 0.111 | 0 |
| 0.500 | 2.000 | 0.848 | 0.102 | 0.250 | 0.062 | 0 |
| 0.600 | 1.250 | 0.848 | 0.102 | 0.640 | 0.230 | 0 |
| 0.600 | 1.500 | 0.848 | 0.102 | 0.444 | 0.160 | 0 |
| 0.600 | 2.000 | 0.848 | 0.102 | 0.250 | 0.090 | 0 |
| 0.700 | 1.250 | 0.848 | 0.102 | 0.640 | 0.314 | 0 |
| 0.700 | 1.500 | 0.848 | 0.102 | 0.444 | 0.218 | 0 |
| 0.700 | 2.000 | 0.848 | 0.102 | 0.250 | 0.122 | 0 |
| 0.800 | 1.250 | 0.848 | 0.102 | 0.640 | 0.410 | 0 |
| 0.800 | 1.500 | 0.848 | 0.102 | 0.444 | 0.284 | 0 |
| 0.800 | 2.000 | 0.848 | 0.102 | 0.250 | 0.160 | 0 |

## Score Weight Sweep

| weight on resolved | row rank correlation | branch rank correlation | distinct scores |
|---|---|---|---|
| 0.000 | 0.848 | 0.337 | 4 |
| 0.050 | 0.971 | 0.905 | 7 |
| 0.100 | 0.971 | 0.905 | 7 |
| 0.150 | 0.971 | 0.929 | 7 |
| 0.200 | 0.999 | 0.929 | 5 |
| 0.250 | 1.000 | 0.929 | 7 |
| 0.300 | 1.000 | 0.929 | 7 |
| 0.350 | 1.000 | 0.976 | 7 |
| 0.400 | 1.000 | 1.000 | 7 |
| 0.450 | 1.000 | 1.000 | 7 |
| 0.500 | 1.000 | 1.000 | 7 |
| 0.550 | 1.000 | 1.000 | 7 |
| 0.600 | 1.000 | 1.000 | 7 |
| 0.650 | 1.000 | 1.000 | 7 |
| 0.700 | 1.000 | 1.000 | 7 |
| 0.750 | 1.000 | 1.000 | 7 |
| 0.800 | 1.000 | 1.000 | 7 |
| 0.850 | 1.000 | 1.000 | 7 |
| 0.900 | 1.000 | 1.000 | 7 |
| 0.950 | 1.000 | 1.000 | 7 |
| 1.000 | 0.892 | 1.000 | 2 |

## Score Weight Breakpoints

| weights on resolved where two score cells tie | interval around the shipped weight with one fixed order |
|---|---|
| 0.200, 0.286, 0.333, 0.394, 0.474 | 0.474 to 1.000 |

## Formal Status By Solved

| formal status | rows | solved |
|---|---|---|
| proved | 793 | 793 |
| partial | 16 | 3 |
| statement | 2,794 | 1,407 |
| none | 1,606 | 262 |

## Leakage Ladder

| neighbour rule | groups | ROC AUC | 95% interval |
|---|---|---|---|
| self excluded only, the shipped rule | 5,209 | 0.766 | 0.752 to 0.779 |
| variant family excluded | 3,015 | 0.677 | 0.655 to 0.698 |
| family and near duplicates at 0.98 excluded | 3,005 | 0.676 | 0.654 to 0.697 |
| family and near duplicates at 0.95 excluded | 2,968 | 0.675 | 0.655 to 0.696 |
| family and near duplicates at 0.9 excluded | 2,722 | 0.672 | 0.649 to 0.695 |

## Models Under Grouped Cross-Validation

| model | ROC AUC | 95% interval | Brier score |
|---|---|---|---|
| branch base rate | 0.548 | 0.523 to 0.574 | 0.214 |
| branch, source and kind base rate | 0.714 | 0.691 to 0.736 | 0.182 |
| reach alone | 0.674 | 0.653 to 0.694 | 0.202 |
| branch, source and kind plus reach | 0.758 | 0.737 to 0.779 | 0.177 |

## AUC Gains

| comparison | AUC gain | 95% interval |
|---|---|---|
| reach over branch base rate | 0.127 | 0.098 to 0.156 |
| reach added to branch, source and kind | 0.044 | 0.030 to 0.058 |

## AUC Within Branch

| stratum | rows | solved | ROC AUC | 95% interval | Youden tau | quantile rule tau |
|---|---|---|---|---|---|---|
| applied | 82 | 32 | 0.801 | 0.686 to 0.902 | 0.700 | 0.656 |
| biophysics | 218 | 31 | 0.809 | 0.731 to 0.877 | 0.670 | 0.655 |
| chemistry | 104 | 22 | 0.803 | 0.665 to 0.913 | 0.706 | 0.676 |
| cosmology | 139 | 28 | 0.772 | 0.661 to 0.870 | 0.708 | 0.648 |
| information | 137 | 41 | 0.586 | 0.474 to 0.697 | 0.752 | 0.680 |
| mathematics | 4,112 | 1,475 | 0.644 | 0.616 to 0.672 | 0.841 | 0.784 |
| mind | 139 | 10 | 0.621 | 0.383 to 0.839 | 0.697 | 0.605 |
| physics | 278 | 55 | 0.690 | 0.594 to 0.804 | 0.730 | 0.673 |

## AUC Within Source

| stratum | rows | solved | ROC AUC | 95% interval | Youden tau | quantile rule tau |
|---|---|---|---|---|---|---|
| formal-conjectures | 3,567 | 1,419 | 0.621 | 0.591 to 0.653 | 0.841 | 0.786 |
| other | 359 | 19 | 0.900 | 0.837 to 0.956 | 0.700 | 0.700 |
| wikipedia | 1,283 | 256 | 0.557 | 0.520 to 0.596 | 0.693 | 0.662 |

## AUC Within Kind

| stratum | rows | solved | ROC AUC | 95% interval | Youden tau | quantile rule tau |
|---|---|---|---|---|---|---|
| top-level | 3,015 | 930 | 0.726 | 0.708 to 0.746 | 0.823 | 0.712 |
| variant | 2,194 | 764 | 0.587 | 0.546 to 0.632 | 0.841 | 0.781 |

## Leave One Branch Out

| held-out branch | rows | solved | ROC AUC | tau from the other branches | solved inside | open inside |
|---|---|---|---|---|---|---|
| applied | 82 | 32 | 0.801 | 0.832 | 0.250 | 0.000 |
| biophysics | 218 | 31 | 0.809 | 0.832 | 0.097 | 0.011 |
| chemistry | 104 | 22 | 0.803 | 0.832 | 0.227 | 0.012 |
| cosmology | 139 | 28 | 0.772 | 0.832 | 0.000 | 0.000 |
| information | 137 | 41 | 0.586 | 0.832 | 0.122 | 0.062 |
| mathematics | 4,112 | 1,475 | 0.644 | 0.697 | 0.993 | 0.977 |
| mind | 139 | 10 | 0.621 | 0.832 | 0.000 | 0.000 |
| physics | 278 | 55 | 0.690 | 0.832 | 0.018 | 0.000 |

## Held-Out Branch Tau

Each tau is Youden's J on the other seven branches, with a bootstrap interval. The pooled row scores every row at the tau fitted without its branch.

| held-out branch | rows | tau from the other branches | 95% interval |
|---|---|---|---|
| applied | 82 | 0.832 | 0.800 to 0.841 |
| biophysics | 218 | 0.832 | 0.823 to 0.841 |
| chemistry | 104 | 0.832 | 0.801 to 0.841 |
| cosmology | 139 | 0.832 | 0.801 to 0.841 |
| information | 137 | 0.832 | 0.800 to 0.841 |
| mathematics | 4,112 | 0.697 | 0.690 to 0.708 |
| mind | 139 | 0.832 | 0.806 to 0.841 |
| physics | 278 | 0.832 | 0.823 to 0.841 |

| pooled held-out measure | value | 95% interval |
|---|---|---|
| tpr | 0.877 | 0.857 to 0.899 |
| fpr | 0.736 | 0.709 to 0.757 |
| youden_j | 0.141 | 0.113 to 0.174 |

## Calibration

| decile | rows | reach from | reach to | mean reach | solved share | predicted share |
|---|---|---|---|---|---|---|
| 1 | 521 | 0.513 | 0.679 | 0.636 | 0.085 | 0.084 |
| 2 | 521 | 0.679 | 0.739 | 0.708 | 0.205 | 0.154 |
| 3 | 521 | 0.739 | 0.780 | 0.762 | 0.244 | 0.237 |
| 4 | 521 | 0.780 | 0.800 | 0.791 | 0.259 | 0.292 |
| 5 | 521 | 0.800 | 0.816 | 0.808 | 0.345 | 0.330 |
| 6 | 521 | 0.816 | 0.828 | 0.822 | 0.273 | 0.358 |
| 7 | 521 | 0.828 | 0.840 | 0.834 | 0.344 | 0.388 |
| 8 | 521 | 0.840 | 0.853 | 0.846 | 0.426 | 0.417 |
| 9 | 521 | 0.853 | 0.872 | 0.862 | 0.491 | 0.454 |
| 10 | 520 | 0.872 | 0.950 | 0.895 | 0.581 | 0.537 |

## Derived Tau

| criterion | tau | 95% interval | solved inside | open inside | Youden J | precision |
|---|---|---|---|---|---|---|
| youden | 0.832 | 0.800 to 0.841 | 0.535 | 0.282 | 0.254 | 0.478 |
| fixed_fpr_0.1 | 0.861 | 0.859 to 0.865 | 0.253 | 0.100 | 0.153 | 0.549 |
| fixed_fpr_0.2 | 0.843 | 0.841 to 0.846 | 0.431 | 0.200 | 0.232 | 0.510 |
| quantile_rule | 0.752 | 0.732 to 0.763 | 0.900 | 0.718 | 0.182 | 0.377 |
| shipped | 0.762 | n/a | 0.884 | 0.690 | 0.195 | 0.382 |

## Shipped Frontier At Proposed Values

| proposal | tau | inside | outside | reachable | beyond | unsampled | rows changing zone | branch rank correlation | growth top 20 kept | edge top 20 kept |
|---|---|---|---|---|---|---|---|---|---|---|
| tau_youden | 0.832 | 2,789 | 2,420 | 1,095 | 2,420 | 0 | 1,339 | 0.927 | 0 | 0 |
| tau_fixed_fpr_0.1 | 0.861 | 2,161 | 3,048 | 467 | 3,048 | 0 | 1,967 | 0.873 | 0 | 0 |
| min_branch_solved_20 | 0.762 | 4,128 | 1,081 | 2,434 | 952 | 129 | 129 | 1.000 | 3 | 20 |

## Time Split

| cutoff | solved by cutoff | tested, dated | solved later | ROC AUC | 95% interval | branch base rate AUC | 95% interval | AUC gain | 95% interval | AUC with undated rows |
|---|---|---|---|---|---|---|---|---|---|---|
| 2005 | 170 | 287 | 48 | 0.738 | 0.661 to 0.811 | 0.441 | 0.358 to 0.526 | 0.297 | 0.160 to 0.426 | 0.804 |
| 2015 | 213 | 318 | 40 | 0.743 | 0.660 to 0.822 | 0.472 | 0.368 to 0.579 | 0.271 | 0.097 to 0.442 | 0.809 |
| 2021 | 261 | 449 | 16 | 0.830 | 0.712 to 0.928 | 0.525 | 0.427 to 0.629 | 0.305 | 0.109 to 0.455 | 0.892 |

## Time Split Against Source Base Rate

| cutoff | source base rate AUC | 95% interval | AUC gain of reach | 95% interval |
|---|---|---|---|---|
| 2005 | 0.557 | 0.468 to 0.644 | 0.181 | 0.077 to 0.288 |
| 2015 | 0.791 | 0.700 to 0.870 | -0.048 | -0.164 to 0.057 |
| 2021 | 0.932 | 0.875 to 0.976 | -0.102 | -0.230 to -0.001 |

## Time Split Sources

| cutoff | source list | tested | solved later |
|---|---|---|---|
| 2005 | https://web.archive.org/web/2007/http://www.sciencemag.org/cgi/content/full/309/5731/78b | 117 | 4 |
| 2005 | tools/solvability-atlas/problems.tsv | 57 | 8 |
| 2005 | formal-conjectures | 37 | 2 |
| 2005 | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_mathematics | 19 | 15 |
| 2005 | https://en.wikipedia.org/wiki/Hilbert's_problems | 17 | 0 |
| 2005 | https://en.wikipedia.org/wiki/Smale's_problems | 14 | 0 |
| 2005 | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_physics | 9 | 9 |
| 2005 | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_neuroscience | 2 | 0 |
| 2015 | https://web.archive.org/web/2007/http://www.sciencemag.org/cgi/content/full/309/5731/78b | 114 | 1 |
| 2015 | tools/solvability-atlas/problems.tsv | 60 | 7 |
| 2015 | formal-conjectures | 43 | 1 |
| 2015 | https://catdir.loc.gov/catdir/toc/ecip057/2005003411.html | 23 | 0 |
| 2015 | https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_mathematics | 19 | 15 |
| 2015 | https://en.wikipedia.org/wiki/Hilbert's_problems | 17 | 0 |
| 2015 | https://en.wikipedia.org/wiki/Smale's_problems | 14 | 0 |
| 2015 | https://en.wikipedia.org/wiki/Xprize_Foundation | 8 | 5 |
| 2021 | https://web.archive.org/web/2023id_/https://www.science.org/do/10.1126/resource.2499249/full/sjtu-booklet.pdf | 122 | 0 |
| 2021 | https://web.archive.org/web/2007/http://www.sciencemag.org/cgi/content/full/309/5731/78b | 113 | 0 |
| 2021 | tools/solvability-atlas/problems.tsv | 60 | 4 |
| 2021 | formal-conjectures | 44 | 0 |
| 2021 | https://pubs.acs.org/toc/achre4/50/3 | 26 | 0 |
| 2021 | https://catdir.loc.gov/catdir/toc/ecip057/2005003411.html | 23 | 0 |
| 2021 | https://en.wikipedia.org/wiki/Hilbert's_problems | 17 | 0 |
| 2021 | https://en.wikipedia.org/wiki/Smale's_problems | 14 | 0 |

## Time Split Tau

Tau is picked from the snapshot at the cutoff and scored on the dated rows that were open then.

| cutoff | criterion | tau | later solved inside | still open inside | precision | rows inside |
|---|---|---|---|---|---|---|
| 2005 | youden | 0.705 | 0.667 | 0.314 | 0.299 | 107 |
| 2005 | quantile_rule | 0.639 | 0.917 | 0.728 | 0.202 | 218 |
| 2005 | fixed_fpr_0.1 | 0.784 | 0.125 | 0.063 | 0.286 | 21 |
| 2005 | fixed_fpr_0.2 | 0.758 | 0.250 | 0.130 | 0.279 | 43 |
| 2015 | youden | 0.702 | 0.700 | 0.356 | 0.221 | 127 |
| 2015 | quantile_rule | 0.639 | 0.950 | 0.766 | 0.151 | 251 |
| 2015 | fixed_fpr_0.1 | 0.798 | 0.300 | 0.058 | 0.429 | 28 |
| 2015 | fixed_fpr_0.2 | 0.771 | 0.375 | 0.119 | 0.312 | 48 |
| 2021 | youden | 0.697 | 0.875 | 0.381 | 0.078 | 179 |
| 2021 | quantile_rule | 0.665 | 0.938 | 0.605 | 0.054 | 277 |
| 2021 | fixed_fpr_0.1 | 0.793 | 0.438 | 0.062 | 0.206 | 34 |
| 2021 | fixed_fpr_0.2 | 0.759 | 0.562 | 0.141 | 0.129 | 70 |
