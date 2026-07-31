REVOKE ALL ON FUNCTION public.registrar_motivo_ajuste(TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_motivo_ajuste(TEXT, UUID, TEXT) TO authenticated;