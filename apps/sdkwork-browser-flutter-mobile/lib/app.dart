import 'package:flutter/material.dart';

class BrowserApp extends StatelessWidget {
  const BrowserApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'SDKWork Browser',
      home: Scaffold(
        body: Center(
          child: Text('SDKWork Browser Flutter Mobile'),
        ),
      ),
    );
  }
}
