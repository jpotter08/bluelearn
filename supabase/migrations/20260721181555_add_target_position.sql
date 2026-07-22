ALTER TABLE objective_revision_nodes
ADD COLUMN target_position INTEGER;

ALTER TABLE objective_revision_nodes
ADD CONSTRAINT target_position_check 
CHECK (
  (is_target = true) OR (target_position IS NULL)
);
