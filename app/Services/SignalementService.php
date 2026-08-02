<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Signalement\CreateSignalementDTO;
use App\DTOs\Signalement\UpdateSignalementDTO;
use App\Enums\SignalementStatutEnum;
use App\Exceptions\Business\InvalidTransitionException;
use App\Models\Signalement;
use App\Repositories\Contracts\SignalementRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final readonly class SignalementService
{
    public function __construct(
        private SignalementRepositoryInterface $repository,
    ) {
    }

    public function create(CreateSignalementDTO $dto): Signalement
    {
        return DB::transaction(function () use ($dto): Signalement {

            /** @var Signalement $signalement */
            $signalement = $this->repository->create(
                $dto->toArray()
            );

            /*
             |--------------------------------------------------------------------------
             | Types de déchets
             |--------------------------------------------------------------------------
             */
            if ($dto->type_dechets !== []) {

                $attachData = [];

                foreach ($dto->type_dechets as $item) {

                    if (empty($item['type_dechet_id'])) {
                        continue;
                    }

                    $attachData[$item['type_dechet_id']] = [
                        'quantite_estime' => $item['quantite_estime'] ?? null,
                        'volume_estime'   => $item['volume_estime'] ?? null,
                        'dangerosite'     => $item['dangerosite'] ?? null,
                        'remarque'        => $item['remarque'] ?? null,
                    ];
                }

                if ($attachData !== []) {
                    $signalement
                        ->typeDechets()
                        ->attach($attachData);
                }
            }

            /*
             |--------------------------------------------------------------------------
             | Photos
             |--------------------------------------------------------------------------
             */
            if ($dto->photos !== []) {

                foreach ($dto->photos as $photo) {

                    $signalement->photos()->create([
                        'url' => $photo,
                    ]);
                }
            }

            return $signalement->load([
                'typeDechets',
                'photos',
            ]);
        });
    }

    public function update(
        Signalement $signalement,
        UpdateSignalementDTO $dto
    ): Signalement {

        return DB::transaction(function () use (
            $signalement,
            $dto
        ): Signalement {

            if (
                $dto->statut !== null &&
                $dto->statut !== $signalement->statut
            ) {
                $this->validateTransition(
                    $signalement->statut,
                    $dto->statut
                );
            }

            /** @var Signalement */
            return $this->repository->update(
                $signalement,
                $dto->toArray()
            );
        });
    }

    public function transitionTo(
        Signalement $signalement,
        SignalementStatutEnum $newStatut
    ): Signalement {

        return DB::transaction(function () use (
            $signalement,
            $newStatut
        ): Signalement {

            if ($signalement->statut === $newStatut) {
                return $signalement;
            }

            $this->validateTransition(
                $signalement->statut,
                $newStatut
            );

            /** @var Signalement */
            return $this->repository->update(
                $signalement,
                [
                    'statut' => $newStatut->value,
                ]
            );
        });
    }

    private function validateTransition(
        SignalementStatutEnum $current,
        SignalementStatutEnum $next
    ): void {

        if (
            ! in_array(
                $next,
                $current->transitionsAutorisees(),
                true
            )
        ) {
            throw new InvalidTransitionException(
                $current->value,
                $next->value
            );
        }
    }

    public function findOrFail(
        int|string $id
    ): Signalement {

        /** @var Signalement */
        return $this->repository->findOrFail($id);
    }

    public function paginate(
        int $perPage = 15
    ): LengthAwarePaginator {

        return $this->repository->paginate($perPage);
    }

    public function delete(
        Signalement $signalement
    ): bool {

        return $this->repository->delete($signalement);
    }
}
