<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ImportQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.text' => ['required', 'string'],
            'questions.*.answers' => ['required', 'array', 'min:2'],
            'questions.*.answers.*.text' => ['required', 'string'],
            'questions.*.answers.*.isCorrect' => ['required', 'boolean'],
        ];
    }
}
