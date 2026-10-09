<?php

namespace App\DTOs\Admin;

readonly class ScrapedAnswerData
{
    public function __construct(
        public string $text,
        public bool $isCorrect
    ) {}
    
    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'isCorrect' => $this->isCorrect,
        ];
    }
}
