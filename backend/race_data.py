"""Static race data extracted from the PDF - Le Journal Hippique PMU'B."""

RACE_INFO = {
    "id": "prix-pavillon-royal-2026-04-12",
    "name": "Prix du Pavillon Royal",
    "event_type": "4+1 du Dimanche",
    "meeting_label": "ParisLongchamp",
    "course_label": "",
    "race_type": "Plat",
    "start_mode": "",
    "date": "Dimanche 12 Avril 2026",
    "date_iso": "2026-04-12T14:00:00+02:00",
    "location": "ParisLongchamp",
    "discipline": "Plat",
    "distance_m": 2400,
    "runners": 16,
    "prize_euros": 50900,
    "prize_fcfa": 33500000,
    "hero_image": "https://images.pexels.com/photos/6818590/pexels-photo-6818590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "secondary_image": "https://images.pexels.com/photos/34665172/pexels-photo-34665172.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
}

HORSES = [
    {"number": 1, "name": "ZULU WARRIOR", "jockey": "A. Pouchin", "trainer": "A. Fabre", "owner": "Chevotel Racing",
     "weight": "60 kg", "age": 6, "sex": "H", "perf": "4.9.1.1.0", "gains_fcfa": 142560,
     "commentary": "Vainqueur d'un Quinté+ l'été dernier à Dieppe, ce fils de Saxon Warrior a été longuement arrêté entre août et mars. Il vient toutefois de réaliser une rentrée encourageante (4e) dans une Classe 3 de bon niveau. Abaissé de trois livres, il est de retour dans les handicaps avec de légitimes prétentions."},
    {"number": 2, "name": "KARLA JET", "jockey": "R. Thomas", "trainer": "C&Y. Lerner", "owner": "PY. Lefevre",
     "weight": "59 kg", "age": 4, "sex": "F", "perf": "8.6.1.1", "gains_fcfa": 22850,
     "commentary": "Placée à 3 ans, cette représentante de l'écurie Chevotel Racing a pris une honorable troisième place lors de sa course de rentrée, directement dans un Quinté+. Elle va certainement beaucoup progresser sur cette sortie et pourrait bien s'illustrer dès sa deuxième tentative à ce niveau."},
    {"number": 3, "name": "DONE DEAL", "jockey": "T. Bachelot", "trainer": "A. Suborics", "owner": "HJ Racing Team",
     "weight": "59 kg", "age": 5, "sex": "M", "perf": "7.3.8.6.9", "gains_fcfa": 52987,
     "commentary": "Lors de sa rentrée, ce pensionnaire d'Andreas Suborics a pris une excellente troisième place dans une Classe 1 très bien composée. Il semble bien placé en valeur 40 pour son premier Quinté+. À suivre de près."},
    {"number": 4, "name": "GERARD TER BORCH", "jockey": "A. Hamelin", "trainer": "M. Delzangles", "owner": "Angles",
     "weight": "58,5 kg", "age": 4, "sex": "H", "perf": "6.1.3.3.2", "gains_fcfa": 72491,
     "commentary": "Après plusieurs accessits, cet élève de Mikel Delzangles a fini par remporter son Quinté+ le 13 novembre. Il devrait être bien plus à son aise sur 2 400 mètres. Il garde son mot à dire pour les places."},
    {"number": 5, "name": "DON'T SHUT ME DOWN", "jockey": "M. Guyon", "trainer": "P&J. Brandt", "owner": "P. Brandt",
     "weight": "58 kg", "age": 4, "sex": "H", "perf": "7.6.9.2.8", "gains_fcfa": 53967,
     "commentary": "Depuis sa victoire dans un Quinté+ le 11 septembre, ce concurrent de Pia Brandt reste capable de prendre des places. Il va retrouver Maxime Guyon, le seul jockey à l'avoir mené au succès. Rachat escompté !"},
    {"number": 6, "name": "SEONA", "jockey": "C. Lecoeuvre", "trainer": "FR. Monfort", "owner": "A. Gray",
     "weight": "57 kg", "age": 4, "sex": "F", "perf": "2.6.2.7.1", "gains_fcfa": 87706,
     "commentary": "Auteur d'une belle année de 3 ans, avec notamment une victoire dans un Quinté+, cette protégée d'Andrew Gray a bien débuté 2026, comme le prouve sa récente deuxième place. Régulière, elle peut se placer."},
    {"number": 7, "name": "FIUMICCINO", "jockey": "H. Journiac", "trainer": "D. Cottin", "owner": "JPJ. Dubois",
     "weight": "57 kg", "age": 4, "sex": "H", "perf": "2.1.0.5.0", "gains_fcfa": 41956,
     "commentary": "Depuis sa victoire dans un handicap à Salon-de-Provence en novembre, ce fils de Chachnak n'a pu confirmer en plat. Il a toutefois repris du moral en obstacle. Pas facile !"},
    {"number": 8, "name": "MARINALEDA", "jockey": "C. Demuro", "trainer": "M. Baratti", "owner": "G. Bajetti",
     "weight": "55,5 kg", "age": 4, "sex": "F", "perf": "2.2.3.7.5", "gains_fcfa": 36472,
     "commentary": "Après avoir échoué de peu lors de sa rentrée, cette pensionnaire de Mario Baratti a pris une bonne deuxième place dans le Prix Dunette sur 2 000 mètres. Elle évolue en bonne forme. Malgré tout, elle peut se placer."},
    {"number": 9, "name": "MOST GLAMOROUS", "jockey": "S. Pasquier", "trainer": "Clement & Hermans", "owner": "T.R. Wahlstedt",
     "weight": "55,5 kg", "age": 5, "sex": "F", "perf": "4.0.1.4.5", "gains_fcfa": 35987,
     "commentary": "L'an passé, cette fille de Mo Town a été dominée à l'occasion de son premier Quinté+. Elle a toutefois rassuré en se classant quatrième du Prix Dunette. Elle devrait apprécier le retour sur 2400 mètres."},
    {"number": 10, "name": "REMBRAND TO GO", "jockey": "M. Grandin", "trainer": "M. Rulec", "owner": "C. Bockelmann",
     "weight": "55,5 kg", "age": 4, "sex": "M", "perf": "3.5.4.2.1", "gains_fcfa": 31490,
     "commentary": "Depuis sa victoire dans une deuxième épreuve le 28 novembre, ce concurrent de Miroslav Rulec a enchaîné les bonnes performances. Il donne toujours le meilleur de lui-même et aura quelques supporters."},
    {"number": 11, "name": "SHRIHARA", "jockey": "E. Hardouin", "trainer": "C. Fey", "owner": "G. Sellier",
     "weight": "55,5 kg", "age": 6, "sex": "F", "perf": "5.1.3.1.2", "gains_fcfa": 28982,
     "commentary": "Irréprochable depuis son arrivée en France, cette élève de Carina Fey a effectué une rentrée intéressante dans le Prix Dunette. Elle est en mesure de se placer si tout se passe bien."},
    {"number": 12, "name": "LINFASOMMER", "jockey": "J. Claudic", "trainer": "M. Pitart", "owner": "JP. Roman",
     "weight": "55 kg", "age": 6, "sex": "F", "perf": "7.5.4.1.7", "gains_fcfa": 119968,
     "commentary": "Après avoir remporté un handicap lors de sa rentrée à Cagnes, cette pensionnaire de Mathieu Pitart s'est classée quatrième, cinquième et septième de Quinté+. Malgré cela, nous lui en préférons d'autres."},
    {"number": 13, "name": "ZILRAK", "jockey": "M. Velon", "trainer": "Butel & Beaunez", "owner": "Haras de Couely",
     "weight": "54,5 kg", "age": 6, "sex": "H", "perf": "9.4.4.0.1", "gains_fcfa": 115967,
     "commentary": "Ce représentant du Haras de Couely a conclu honorablement à Fontainebleau. Il devrait apprécier le fait de retrouver ParisLongchamp. Muni d'œillères australiennes pour l'occasion, il peut surprendre."},
    {"number": 14, "name": "KENCHAK", "jockey": "A. Crastus", "trainer": "A. Fouassier", "owner": "SCEA Ec. Bader",
     "weight": "54 kg", "age": 4, "sex": "H", "perf": "1.7.3.3.3", "gains_fcfa": 40446,
     "commentary": "Lors du second semestre 2025, ce représentant de l'écurie Bader a pris plusieurs podiums. Il aurait préféré une distance plus longue et viendra dans un second choix pour cette course de semi-rentrée."},
    {"number": 15, "name": "PINK MONDAY", "jockey": "G. Congiu", "trainer": "E. Cury", "owner": "M. Bag. de Puchesse",
     "weight": "54 kg", "age": 4, "sex": "H", "perf": "8.5.1.1.1", "gains_fcfa": 28940,
     "commentary": "Après avoir remporté trois handicaps d'affilée, ce pensionnaire d'Elauryne Cury découvre des tâches beaucoup moins aisées désormais. Il monte de catégorie. Pas évident."},
    {"number": 16, "name": "DEMPY", "jockey": "P. Remoue", "trainer": "D. Bonilla", "owner": "P. Wattanavrangkul",
     "weight": "53,5 kg", "age": 5, "sex": "H", "perf": "5.7.7.3.0", "gains_fcfa": 79424,
     "commentary": "Ce concurrent de Davy Bonilla a pris une bonne cinquième place dans le Prix de la Gloriette, étant d'ailleurs le mieux classé du lot. Il donne toujours le meilleur de lui-même et peut se placer."},
]

EXPERT_PREDICTIONS = [
    {"source": "ParisTurf", "picks": [1, 10, 7, 12, 11, 3, 8, 16]},
    {"source": "Voix du Nord", "picks": [8, 16, 3, 5, 2, 1, 10, 4]},
    {"source": "Turf-fr.com", "picks": [8, 9, 5, 10, 16, 6, 4, 1, 2]},
    {"source": "Turfomania", "picks": [8, 6, 2, 1, 5, 4, 10, 7, 9]},
    {"source": "Le Parisien", "picks": [5, 8, 9, 10, 6, 4, 2, 1, 16]},
    {"source": "L'Alsace", "picks": [2, 8, 9, 5, 7, 13, 11, 1, 10]},
    {"source": "Zone-Turf.fr", "picks": [4, 5, 6, 1, 8, 9, 13, 16, 10]},
]

CLASSIFICATIONS = {
    "Forme": [2, 5, 1, 9, 4],
    "Classe": [4, 8, 13, 2, 3],
    "Progrès": [1, 5, 9, 6, 13],
    "Régularité": [6, 13, 11, 5, 10],
}

PREVIOUS_RESULTS = {
    "date": "Mercredi 08/04/2026",
    "race_name": "Prix de la Gloriette",
    "finishing_order": [4, 14, 3, 9, 16],
    "npo": [11],
    "fallers_dq": [3],
    "payouts": [
        {"type": "Ordre", "amount_fcfa": 15860000, "label": "1 gagnant"},
        {"type": "Désordre", "amount_fcfa": 139000, "label": "par mise"},
        {"type": "Bonus", "amount_fcfa": 1000, "label": "4 sur 5"},
        {"type": "Couplé Gagnant", "amount_fcfa": 3000, "label": "4-14"},
        {"type": "Couplé Placé 4-14", "amount_fcfa": 1000, "label": ""},
        {"type": "Couplé Placé 4-3", "amount_fcfa": 5000, "label": ""},
        {"type": "Couplé Placé 14-3", "amount_fcfa": 3000, "label": ""},
    ],
}

BETTING_INFO = {
    "arret_jeux_weekday": "13h 05mn",
    "arret_jeux_weekend": "13h 05mn",
    "arret_jeux_nocturne": "18h 05mn",
    "daylight_saving_note": "Le passage à l'heure d'été a eu lieu dans la nuit du samedi 28 Mars au dimanche 29 Mars 2026 (GMT+1 → GMT+2).",
    "customer_service": "+226 XX XX XX XX",
}


def compute_consensus():
    """Compute consensus ranking based on expert points (8 pts for 1st pick down to 1 pt)."""
    scores = {h["number"]: 0 for h in HORSES}
    appearances = {h["number"]: 0 for h in HORSES}
    for pred in EXPERT_PREDICTIONS:
        picks = pred["picks"]
        for idx, num in enumerate(picks):
            pts = max(len(picks) - idx, 0)
            scores[num] = scores.get(num, 0) + pts
            appearances[num] = appearances.get(num, 0) + 1
    ranked = sorted(
        [{"number": n, "score": scores[n], "appearances": appearances[n]} for n in scores],
        key=lambda x: (-x["score"], -x["appearances"]),
    )
    return ranked
