Diese INDEX.HTML ist eine kleine, browserbasierte Webanwendung, die als digitales Stimmungstagebuch fungiert.

​Es ist eine Single-Page-Application (SPA), die vollständig im Browser läuft und keine klassische Server-Infrastruktur benötigt, da sie sich direkt mit der Google Firebase Cloud-Datenbank verbindet.

​💡 Wofür ist die App gedacht?

​Die Hauptfunktion der App ist die einfache und schnelle Erfassung und Nachverfolgung Ihres emotionalen Zustands (der Stimmung) über den Tag und über die Zeit.

​Erfassung: Sie können zu verschiedenen Tageszeiten (Morgen, Mittag, Abend, Nacht) Ihre aktuelle Stimmung (sehr_gut bis sehr_schlecht) auswählen und optional kurze Notizen hinzufügen.

​Nachverfolgung (Historie): Die App zeigt alle gespeicherten Einträge in einer chronologischen Historie an, sodass Sie Muster und Trends in Ihrem Wohlbefinden erkennen können.

​⭐ Welchen Vorteil bietet die App?

​Der Hauptvorteil dieser Lösung liegt in ihrer Einfachheit, Verfügbarkeit und Sicherheit:

​1. Einfache Verfügbarkeit (Web-App): Sie benötigen keine Installation aus einem App Store. Die App funktioniert direkt über eine öffentliche, sichere URL (https://) in jedem modernen Browser (Chrome, Firefox etc.), sowohl auf dem Smartphone als auch auf dem PC.

​2. Hohe Datensicherheit und Privatsphäre:
​Die Daten (Ihre Stimmungseinträge) werden nicht lokal auf dem Smartphone, sondern in Ihrer privaten Firebase Firestore Datenbank gespeichert.
​Dank der Firebase-Sicherheitsregeln ist gewährleistet, dass jeder Nutzer, der den Link öffnet (auch Ihre Freunde), eine eigene, isolierte, anonyme Identität erhält. Die Einträge bleiben somit nur für den jeweiligen Nutzer sichtbar und sind voneinander getrennt.

​3. Keine Anmeldung/Passwort nötig: Durch die anonyme Authentifizierung müssen Sie sich keine Anmeldedaten merken. Das Tagebuch wird automatisch erkannt, solange Sie denselben Browser auf demselben Gerät verwenden.

​4. Kostenlos: Die gesamte Infrastruktur (Firebase Hosting und Firestore-Datenbank) ist in dem Umfang, den Sie nutzen, kostenlos.
