import 'package:flutter/material.dart';
import '../services/notification_service.dart';

class TaskItem {
  final String nombre;
  bool completada;

  TaskItem({
    required this.nombre,
    this.completada = false,
  });
}

class TaskManagerScreen extends StatefulWidget {
  const TaskManagerScreen({super.key});

  @override
  State<TaskManagerScreen> createState() => _TaskManagerScreenState();
}

class _TaskManagerScreenState extends State<TaskManagerScreen> {
  final List<TaskItem> _tareas = [];

  /// RF-2: Agregar tarea con AlertDialog
  void _mostrarDialogoAgregarTarea() {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Agregar tarea"),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: "Nombre de la tarea",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancelar"),
          ),
          FilledButton(
            onPressed: () {
              final texto = controller.text.trim();

              if (texto.isEmpty) {
                Navigator.pop(context);

                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("El campo no puede estar vacío"),
                  ),
                );
                return;
              }

              setState(() {
                _tareas.add(TaskItem(nombre: texto));
              });

              Navigator.pop(context);
            },
            child: const Text("Agregar"),
          ),
        ],
      ),
    );
  }

  /// RF-1: Completar tarea
  void _completarTarea(int index) {
    setState(() {
      _tareas[index].completada = true;
    });
  }

  /// RF-3: Eliminar tarea con deshacer
  void _eliminarTarea(int index) {
    final tareaEliminada = _tareas[index];
    final posicionOriginal = index;

    setState(() {
      _tareas.removeAt(index);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text("Tarea eliminada"),
        action: SnackBarAction(
          label: "Deshacer",
          onPressed: () {
            setState(() {
              _tareas.insert(posicionOriginal, tareaEliminada);
            });
          },
        ),
      ),
    );
  }

  /// RF-4: BottomSheet de opciones
  void _mostrarOpcionesTarea(int index) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: const Text("Completar"),
              onTap: () {
                Navigator.pop(context);
                _completarTarea(index);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text("Eliminar"),
              onTap: () {
                Navigator.pop(context);
                _eliminarTarea(index);
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications_active_outlined),
              title: const Text("Recordarme"),
              onTap: () async {
                Navigator.pop(context);

                await NotificationService.programarNotificacionDeTarea(
                  _tareas[index].nombre,
                );

                if (!mounted) return;

                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Recordatorio programado en 1 minuto"),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Botón para probar notificaciones rápidamente
  void _probarNotificacion() async {
    await NotificationService.programarNotificacionDeTarea(
      "Prueba de notificación",
    );

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Notificación programada"),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Gestor de tareas"),
      ),

      /// RF-1 Lista de tareas
      body: _tareas.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("No hay tareas registradas"),
                  const SizedBox(height: 20),

                  /// botón para probar notificación
                  ElevatedButton(
                    onPressed: _probarNotificacion,
                    child: const Text("Probar notificación"),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _tareas.length,
              itemBuilder: (context, index) {
                final tarea = _tareas[index];

                return Card(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  child: ListTile(
                    onLongPress: () => _mostrarOpcionesTarea(index),

                    leading: Icon(
                      tarea.completada
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: tarea.completada ? Colors.green : null,
                    ),

                    title: Text(
                      tarea.nombre,
                      style: TextStyle(
                        decoration: tarea.completada
                            ? TextDecoration.lineThrough
                            : TextDecoration.none,
                      ),
                    ),

                    subtitle: Text(
                      tarea.completada ? "Completada" : "Pendiente",
                    ),

                    trailing: Wrap(
                      spacing: 8,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.check),
                          tooltip: "Completar",
                          onPressed: tarea.completada
                              ? null
                              : () => _completarTarea(index),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete),
                          tooltip: "Eliminar",
                          onPressed: () => _eliminarTarea(index),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

      /// RF-2 FloatingActionButton
      floatingActionButton: FloatingActionButton(
        onPressed: _mostrarDialogoAgregarTarea,
        child: const Icon(Icons.add),
      ),
    );
  }
}