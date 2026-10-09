<?php

namespace App\DTOs\Admin;

readonly class CertificateTemplateData
{
    public function __construct(
        public int $id,
        public string $pole,
        public ?string $logoPath,
        public string $bodyText,
        public bool $isActive
    ) {}
}
