<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCertificateTemplateRequest;
use App\Models\CertificateTemplate;
use App\Services\CertificateService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class CertificateTemplateController extends Controller
{
    public function __construct(
        private readonly CertificateService $certificateService
    ) {}

    public function index()
    {
        $templates = CertificateTemplate::all()->map(function ($template) {
            return [
                'id' => $template->id,
                'pole' => $template->pole,
                'logo_url' => $template->logo_path ? Storage::url($template->logo_path) : null,
                'is_active' => $template->is_active,
            ];
        });

        // Ensure we have one for each pole if they don't exist
        if ($templates->isEmpty()) {
            CertificateTemplate::firstOrCreate(['pole' => 'telephonie'], ['body_text' => 'Certificate of Completion for {student_name}']);
            CertificateTemplate::firstOrCreate(['pole' => 'energie'], ['body_text' => 'Certificate of Completion for {student_name}']);
            return redirect()->route('admin.certificate-templates.index');
        }

        return Inertia::render('admin/certificate-templates/index', [
            'templates' => $templates,
        ]);
    }

    public function edit(CertificateTemplate $template)
    {
        return Inertia::render('admin/certificate-templates/edit', [
            'template' => [
                'id' => $template->id,
                'pole' => $template->pole,
                'logo_url' => $template->logo_path ? Storage::url($template->logo_path) : null,
                'body_text' => $template->body_text,
                'is_active' => $template->is_active,
            ],
        ]);
    }

    public function update(UpdateCertificateTemplateRequest $request, CertificateTemplate $template)
    {
        $data = ['body_text' => $request->body_text];

        if ($request->hasFile('logo')) {
            if ($template->logo_path) {
                Storage::disk('public')->delete($template->logo_path);
            }
            $path = $request->file('logo')->store('certificates/logos', 'public');
            $data['logo_path'] = $path;
        }

        $template->update($data);

        return redirect()->back()->with('success', 'Template updated successfully.');
    }

    public function preview(CertificateTemplate $template)
    {
        return $this->certificateService->generatePreview($template);
    }
}
