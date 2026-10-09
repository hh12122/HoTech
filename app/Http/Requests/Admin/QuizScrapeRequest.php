<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class QuizScrapeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'url' => ['required_without:file', 'url', 'nullable'],
            'file' => ['required_without:url', 'file', 'mimetypes:text/html', 'nullable'],
        ];
    }
}
