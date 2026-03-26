-- Maintain updated_at on UPDATE for Growth Engine tables (reuse update_updated_at_column from blog schema).

DROP TRIGGER IF EXISTS update_growth_realtime_alerts_updated_at ON public.growth_realtime_alerts;
CREATE TRIGGER update_growth_realtime_alerts_updated_at
  BEFORE UPDATE ON public.growth_realtime_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_growth_experiment_drafts_updated_at ON public.growth_experiment_drafts;
CREATE TRIGGER update_growth_experiment_drafts_updated_at
  BEFORE UPDATE ON public.growth_experiment_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
