<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim($this->title),
        ]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'pole' => ['required', 'string', 'in:assurance,telephonie,energie'],
            'languages' => ['required', 'array', 'min:1'],
            'languages.*' => ['string', 'in:fr,de,en'],
            'status' => ['required', 'string', 'in:draft,published'],
        ];
    }

    protected function passedValidation(): void
    {
        // On update, slug is updated if title changes, or kept same.
        // Assuming unique validation is handled properly (omitted for brevity but needed in production)
        $this->merge([
            'slug' => Str::slug($this->title),
        ]);
    }
}
