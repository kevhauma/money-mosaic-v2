import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService, authErrorMessage, type ApiToken, type IssuedApiToken } from '@/core/auth';
import {
  AlertComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  FieldsetComponent,
  InputComponent,
  PaperComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';

/**
 * Settings' "Agent access (MCP)" section (TICKET-MCP-05): the signed-in user's own tokens for
 * `/mcp` — list, create (shown once), revoke. Feedback lives in this component's signals, like the
 * Account section's: nothing else reads these tokens, so there is no store to hydrate or reset.
 */
@Component({
  selector: 'app-settings-mcp-tokens-section',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    FieldsetComponent,
    InputComponent,
    PaperComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-mcp-tokens-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMcpTokensSectionComponent implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly origin = inject(DOCUMENT).location.origin;

  private readonly tokens = signal<readonly ApiToken[] | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly rows = computed(() =>
    (this.tokens() ?? []).map((token) => ({
      ...token,
      created: formatDate(token.createdAt.slice(0, 10)),
      revokeLabel: `Revoke ${token.name}`,
    })),
  );
  protected readonly loaded = computed(() => this.tokens() !== null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
  });
  protected readonly pending = signal(false);
  protected readonly createError = signal<string | null>(null);

  /** The token just created — the one moment its plain value exists in the browser. */
  protected readonly issued = signal<IssuedApiToken | null>(null);
  protected readonly copied = signal(false);
  protected readonly connectCommand = computed(() => {
    const issued = this.issued();
    return issued === null
      ? ''
      : `claude mcp add --transport http money-mosaic ${this.origin}/mcp --header "Authorization: Bearer ${issued.token}"`;
  });

  protected readonly revokeTarget = signal<ApiToken | null>(null);
  protected readonly revokeOpen = signal(false);
  protected readonly revokeError = signal<string | null>(null);
  protected readonly revokePrompt = computed(() => ({
    title: `Revoke "${this.revokeTarget()?.name ?? ''}"?`,
    message: 'Any agent using this token loses access straight away. This cannot be undone.',
  }));

  async ngOnInit(): Promise<void> {
    try {
      this.tokens.set(await this.api.listTokens());
    } catch (error) {
      this.loadError.set(authErrorMessage(error, 'Could not load your tokens.'));
    }
  }

  protected async create(): Promise<void> {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.createError.set(null);
    this.copied.set(false);
    try {
      const issued = await this.api.createToken(this.form.getRawValue().name);
      this.issued.set(issued);
      this.tokens.update((tokens) => [...(tokens ?? []), issued]);
      this.form.reset();
    } catch (error) {
      this.createError.set(authErrorMessage(error, 'Could not create the token.'));
    } finally {
      this.pending.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    this.copied.set(true);
  }

  protected askRevoke(token: ApiToken): void {
    this.revokeTarget.set(token);
    this.revokeError.set(null);
    this.revokeOpen.set(true);
  }

  protected async confirmRevoke(): Promise<void> {
    const target = this.revokeTarget();
    if (target === null) return;
    try {
      await this.api.revokeToken(target.id);
      this.tokens.update((tokens) => (tokens ?? []).filter((token) => token.id !== target.id));
      this.issued.update((issued) => (issued?.id === target.id ? null : issued));
    } catch (error) {
      this.revokeError.set(authErrorMessage(error, 'Could not revoke the token.'));
    }
  }
}
