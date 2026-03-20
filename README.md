# dulce_hogar_movil

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

# Gestor de Tareas con Notificaciones en Flutter

## Descripción de la app

Esta aplicación fue desarrollada en Flutter para Android como un gestor de tareas básico. Su propósito es demostrar la implementación de distintos mensajes emergentes y notificaciones locales dentro de una aplicación móvil.

La app permite:
- visualizar una lista de tareas,
- agregar nuevas tareas,
- marcar tareas como completadas,
- eliminar tareas con opción de deshacer,
- mostrar opciones mediante un ModalBottomSheet,
- programar recordatorios con notificaciones locales.

## Requerimientos funcionales implementados

### RF-1: Lista de tareas
La pantalla principal muestra una lista de tareas con:
- nombre de la tarea,
- estado (pendiente o completada),
- botón para completar,
- botón para eliminar.

### RF-2: Agregar tarea con AlertDialog
Un `FloatingActionButton` abre un `AlertDialog` con un campo de texto para registrar una nueva tarea.

El diálogo incluye:
- botón **Cancelar**
- botón **Agregar**

Si el usuario intenta agregar una tarea con el campo vacío, se muestra un `SnackBar` de error.

### RF-3: Eliminar tarea con SnackBar y Deshacer
Cuando una tarea es eliminada, se muestra un `SnackBar` con el mensaje:

`Tarea eliminada`

Además, incluye la acción **Deshacer**, que restaura la tarea en su posición original.

### RF-4: Opciones de tarea con ModalBottomSheet
Al hacer una pulsación prolongada sobre una tarea, se abre un `ModalBottomSheet` con las siguientes opciones:
- Completar
- Eliminar
- Recordarme

La opción **Recordarme** programa una notificación local.

### RF-5: Notificación local
La app solicita permiso de notificaciones al iniciar en Android 13+.

La notificación programada muestra:
- **Título:** nombre de la tarea
- **Mensaje:** `Tienes una tarea pendiente`

Al tocar la notificación, la aplicación se abre nuevamente.

---

## Tecnologías utilizadas

- Flutter
- Dart
- flutter_local_notifications
- timezone
- permission_handler
- Material Design 3

---

## Estructura principal del proyecto

```text
lib/
 ├── main.dart
 ├── screens/
 │    └── task_manager_screen.dart
 └── services/
      └── notification_service.dart