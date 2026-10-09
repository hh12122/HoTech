<?php

namespace App\Services;

use App\Models\CertificateTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class CertificateService
{
    public function generatePreview(CertificateTemplate $template)
    {
        $body = $template->body_text;
        
        // Dummy data for preview
        $replacements = [
            '{student_name}' => 'John Doe',
            '{course_title}' => 'Advanced Networking',
            '{date}' => date('Y-m-d'),
        ];
        
        foreach ($replacements as $placeholder => $value) {
            $body = str_replace($placeholder, $value, $body);
        }

        $logoBase64 = null;
        if ($template->logo_path && Storage::disk('public')->exists($template->logo_path)) {
            $path = Storage::disk('public')->path($template->logo_path);
            $type = pathinfo($path, PATHINFO_EXTENSION);
            $data = file_get_contents($path);
            $logoBase64 = 'data:image/' . $type . ';base64,' . base64_encode($data);
        }

        // Simple HTML layout
        $html = '
        <html>
        <head>
            <style>
                body { font-family: sans-serif; text-align: center; margin: 50px; }
                .logo { max-height: 100px; margin-bottom: 30px; }
                .content { font-size: 20px; line-height: 1.6; }
            </style>
        </head>
        <body>
            ' . ($logoBase64 ? '<img src="' . $logoBase64 . '" class="logo"/>' : '') . '
            <div class="content">' . $body . '</div>
        </body>
        </html>
        ';

        return Pdf::loadHTML($html)->stream('preview.pdf');
    }
}
