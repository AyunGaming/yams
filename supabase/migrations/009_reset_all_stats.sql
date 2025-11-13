-- =====================================================
-- Migration : Réinitialiser toutes les statistiques des joueurs
-- =====================================================
-- ATTENTION : Cette requête remet à zéro TOUTES les stats de TOUS les joueurs
-- Utilisez avec précaution !

-- Réinitialiser toutes les statistiques
UPDATE public.users
SET 
  -- Stats de base
  parties_jouees = 0,
  parties_gagnees = 0,
  parties_abandonnees = 0,
  
  -- Scores
  meilleur_score = 0,
  
  -- Records spéciaux
  nombre_yams_realises = 0,
  meilleure_serie_victoires = 0,
  serie_victoires_actuelle = 0,
  
  -- Système de leveling
  xp = 0,
  level = 1,
  
  -- Métadonnées
  updated_at = NOW();

-- Afficher le nombre de joueurs mis à jour
-- (Cette ligne sera exécutée mais ne retournera rien dans une migration)
-- SELECT COUNT(*) as joueurs_reset FROM public.users;

-- =====================================================
-- Fin de la migration
-- =====================================================

