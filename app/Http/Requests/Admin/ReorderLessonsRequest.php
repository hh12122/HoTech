<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderLessonsRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() && $this->user()->role === 'admin'; }
    public function rules(): array { return ['ids' => ['required', 'array'], 'ids.*' => ['integer', 'exists:lessons,id']]; }
}
