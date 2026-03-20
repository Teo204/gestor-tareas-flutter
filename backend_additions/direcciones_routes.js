/* =========================================================
   DIRECCIONES DE ENTREGA (RUTAS PROTEGIDAS)
   Agregar estas rutas al router.js existente, después de las
   rutas de favoritos y antes de estadísticas
========================================================= */

// Listar direcciones del usuario autenticado
router.get("/direcciones", verificarToken, async (req, res) => {
  const cedula = req.usuario.id;

  try {
    const { data, error } = await supabase
      .from("direccionentrega")
      .select("iddireccion, direccion, cedula")
      .eq("cedula", cedula)
      .order("iddireccion", { ascending: false });

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error("❌ Error al obtener direcciones:", error.message);
    res.status(500).json({ message: "Error al obtener direcciones" });
  }
});

// Agregar nueva dirección de entrega
router.post("/direcciones", verificarToken, async (req, res) => {
  const cedula = req.usuario.id;
  const { direccion } = req.body;

  if (!direccion || !direccion.trim()) {
    return res.status(400).json({ message: "La dirección es obligatoria" });
  }

  try {
    const { data, error } = await supabase
      .from("direccionentrega")
      .insert([{ cedula, direccion: direccion.trim() }])
      .select("iddireccion, direccion, cedula")
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Dirección agregada correctamente",
      direccion: data,
    });
  } catch (error) {
    console.error("❌ Error al agregar dirección:", error.message);
    res.status(500).json({ message: "Error al agregar dirección" });
  }
});

// Eliminar dirección de entrega
router.delete("/direcciones/:id", verificarToken, async (req, res) => {
  const cedula = req.usuario.id;
  const { id } = req.params;

  try {
    // Verificar que la dirección pertenece al usuario
    const { data: existente, error: errorSelect } = await supabase
      .from("direccionentrega")
      .select("iddireccion")
      .eq("iddireccion", id)
      .eq("cedula", cedula)
      .maybeSingle();

    if (errorSelect) throw errorSelect;

    if (!existente) {
      return res
        .status(404)
        .json({ message: "Dirección no encontrada o no pertenece al usuario" });
    }

    const { error } = await supabase
      .from("direccionentrega")
      .delete()
      .eq("iddireccion", id)
      .eq("cedula", cedula);

    if (error) throw error;

    res.status(200).json({ message: "Dirección eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar dirección:", error.message);
    res.status(500).json({ message: "Error al eliminar dirección" });
  }
});
