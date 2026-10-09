<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLessonRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() && $this->user()->role === 'admin'; }
    public function rules(): array { return ['title' => ['required', 'string', 'max:255']]; }
}
