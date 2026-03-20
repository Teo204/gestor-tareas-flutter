/* =========================================================
   DIRECCIONES DE ENTREGA (RUTAS PROTEGIDAS)
   Pega este bloque en router.js justo antes de "export default router;"
========================================================= */

router.use("/direcciones", verificarToken);

// GET /api/direcciones → listar direcciones del usuario autenticado
router.get("/direcciones", async (req, res) => {
  const cedula = req.usuario.id;
  try {
    const { data, error } = await supabase
      .from("direccionEntrega")
      .select("iddireccion, direccion")
      .eq("cedula", cedula)
      .order("iddireccion", { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error al obtener direcciones:", err.message);
    res.status(500).json({ message: "Error al obtener direcciones" });
  }
});

// POST /api/direcciones → agregar nueva dirección
router.post("/direcciones", async (req, res) => {
  const cedula = req.usuario.id;
  const { direccion } = req.body;

  if (!direccion || !direccion.trim()) {
    return res.status(400).json({ message: "La dirección es obligatoria" });
  }

  try {
    const { data, error } = await supabase
      .from("direccionEntrega")
      .insert([{ cedula, direccion: direccion.trim() }])
      .select("iddireccion, direccion")
      .single();

    if (error) throw error;
    res.status(201).json({ message: "Dirección agregada correctamente", direccion: data });
  } catch (err) {
    console.error("Error al agregar dirección:", err.message);
    res.status(500).json({ message: "Error al agregar dirección" });
  }
});

// DELETE /api/direcciones/:id → eliminar dirección del usuario
router.delete("/direcciones/:id", async (req, res) => {
  const cedula = req.usuario.id;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("direccionEntrega")
      .delete()
      .eq("iddireccion", id)
      .eq("cedula", cedula)
      .select("*");

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Dirección no encontrada" });
    }
    res.status(200).json({ message: "Dirección eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar dirección:", err.message);
    res.status(500).json({ message: "Error al eliminar dirección" });
  }
});
